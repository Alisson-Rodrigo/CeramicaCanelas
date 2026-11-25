using System.Security.Claims;
using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Domain.Enums;
using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Persistence;
using CeramicaCanelas.WebApi.Auditing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel;
using System.Globalization;
using System.Reflection;
using Microsoft.AspNetCore.Http;

namespace CeramicaCanelas.WebApi.Controllers;

[ApiController]
[Route("api/kiln-firings")]
[Authorize(Roles = "Admin,Almoxarifado")]
public sealed class KilnFiringsController(DefaultContext db, IAuditEventWriter audit, IPdfReportService pdf,
    ISpreadsheetReportService spreadsheet, IWebHostEnvironment environment, IConfiguration? configuration = null) : ControllerBase
{
    private const string KilnMigrationId = "20261122190000_AddKilnFiringControl";
    private const string QualityHistoryMigrationId = "20261123010822_AddKilnFiringQualityHistory";
    private readonly KilnBurnerRosterEntry[] _burnerRoster =
        configuration?.GetSection("KilnBurnerRoster").Get<KilnBurnerRosterEntry[]>() ?? [];

    private sealed record KilnBurnerRosterEntry(Guid EmployeeId, bool Enabled, string? DisplayName = null);

    private IQueryable<Employee> AvailableBurners()
    {
        var included = _burnerRoster.Where(entry => entry.Enabled).Select(entry => entry.EmployeeId).ToArray();
        var excluded = _burnerRoster.Where(entry => !entry.Enabled).Select(entry => entry.EmployeeId).ToArray();
        return db.Employees.Where(employee => employee.IsActive && !excluded.Contains(employee.Id) &&
            (employee.Positiions == Positiions.Queimador || included.Contains(employee.Id)));
    }

    private string BurnerName(Guid employeeId, string fallback) =>
        _burnerRoster.FirstOrDefault(entry => entry.Enabled && entry.EmployeeId == employeeId)?.DisplayName ?? fallback;
    private static readonly CategoryOption[] InitialCategories =
    [
        new(Guid.Parse("d14b63f9-3a57-4637-90ac-e12ce2510001"), "Primeira linha"),
        new(Guid.Parse("d14b63f9-3a57-4637-90ac-e12ce2510002"), "Segunda linha"),
        new(Guid.Parse("d14b63f9-3a57-4637-90ac-e12ce2510003"), "Caldeado"),
        new(Guid.Parse("d14b63f9-3a57-4637-90ac-e12ce2510004"), "Trincados"),
        new(Guid.Parse("d14b63f9-3a57-4637-90ac-e12ce2510005"), "Reenfornados")
    ];
    public sealed record CategoryOption(Guid Id, string Name);
    public sealed record FiringProductInput(ProductType ProductType, int Quantity);
    public sealed record CreateFiringInput(string KilnName, DateTimeOffset StartedAt, DateTimeOffset FinishedAt,
        IReadOnlyCollection<FiringProductInput> Products, IReadOnlyCollection<Guid> BurnerIds, string? Notes);
    public sealed record QualityInput(ProductType ProductType, Guid CategoryId, int Quantity);
    public sealed record QualityUpdateInput(IReadOnlyCollection<QualityInput> Items, string? DifferenceJustification, string? Observations);
    public sealed record QualityCategoryCreateInput(string Name);
    public sealed record QualityCategoryUpdateInput(string Name, bool IsActive);
    public sealed record CancelFiringInput(string Reason);

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (await IsKilnMigrationPending(ct)) return MigrationRequired();
        var firing = await VisibleFirings().Include(x => x.Products).Include(x => x.Burners)
            .Include(x => x.Quality).ThenInclude(x => x.Category)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsCancelled, ct);
        if (firing is null) return NotFound();
        return Ok(new { firing.Id, firing.KilnName, firing.StartedAtUtc, firing.FinishedAtUtc,
            durationMinutes = (int)firing.Duration.TotalMinutes, firing.DurationClass, firing.RegisteredByUserId,
            firing.RegisteredByName, firing.CreatedOn, firing.ModifiedOn, firing.Notes, firing.DifferenceJustification,
            firing.QualityConferencedByUserId, firing.QualityConferencedByName, firing.QualityConferencedAtUtc,
            firing.QualityConferenceObservations, qualityConferenceState = firing.QualityConferenceState ?? firing.ConferenceStatus,
            products = firing.Products.Select(x => new { productType = (int)x.ProductType, x.ProductNameSnapshot, x.Quantity }),
            burners = firing.Burners.Select(x => new { x.EmployeeId, x.EmployeeNameSnapshot }),
            quality = firing.Quality.Select(x => new { productType = (int)x.ProductType, x.CategoryId, categoryName = x.CategoryNameSnapshot, x.Quantity }),
            firing.LoadedTotal, firing.ClassifiedTotal, firing.ConferenceStatus });
    }

    [HttpGet("{id:guid}/quality-history")]
    public async Task<IActionResult> GetQualityHistory(Guid id, CancellationToken ct)
    {
        if (await IsKilnMigrationPending(ct)) return MigrationRequired();
        var exists = await VisibleFirings().AnyAsync(x => x.Id == id && !x.IsCancelled, ct);
        if (!exists) return NotFound();
        var revisions = await db.KilnFiringQualityRevisions.AsNoTracking()
            .Where(x => x.FiringId == id).OrderByDescending(x => x.RevisionNumber)
            .Include(x => x.Items).ToListAsync(ct);
        return Ok(revisions.Select(x => new
        {
            x.Id, x.RevisionNumber, x.ConferencedByUserId, x.ConferencedByName, x.ConferencedAtUtc,
            x.Observations, x.DifferenceJustification, x.State, x.LoadedTotal, x.ClassifiedTotal, x.UnclassifiedTotal,
            items = x.Items.OrderBy(i => i.ProductNameSnapshot).ThenBy(i => i.CategoryNameSnapshot)
                .Select(i => new { productType = (int)i.ProductType, i.ProductNameSnapshot, i.CategoryId, i.CategoryNameSnapshot, i.Quantity })
        }));
    }

    [HttpGet("options")]
    public async Task<IActionResult> Options(CancellationToken ct)
    {
        var migrationPending = await IsKilnMigrationPending(ct);
        var products = KilnProductCatalog.Options();
        var employees = await AvailableBurners().AsNoTracking().Select(employee => new { employee.Id, employee.Name }).ToListAsync(ct);
        var burners = employees.Select(employee => new { employee.Id, Name = BurnerName(employee.Id, employee.Name) })
            .OrderBy(employee => employee.Name).ToList();
        if (!migrationPending)
        {
            var existingNames = await db.KilnQualityCategories.Select(x => x.Name).ToListAsync(ct);
            var existingIds = await db.KilnQualityCategories.Select(x => x.Id).ToListAsync(ct);
            foreach (var category in InitialCategories.Where(x => !existingIds.Contains(x.Id) && !existingNames.Contains(x.Name, StringComparer.OrdinalIgnoreCase)))
                db.KilnQualityCategories.Add(new KilnQualityCategory { Id = category.Id, Name = category.Name, SortOrder = InitialCategories.ToList().FindIndex(x => x.Id == category.Id) + 1, IsActive = true });
            if (db.ChangeTracker.HasChanges()) await db.SaveChangesAsync(ct);
        }
        var categories = migrationPending ? InitialCategories.ToList() : await db.KilnQualityCategories.AsNoTracking()
            .Where(x => x.IsActive).OrderBy(x => x.SortOrder).ThenBy(x => x.Name)
            .Select(x => new CategoryOption(x.Id, x.Name)).ToListAsync(ct);
        return Ok(new { products, burners, categories, migrationPending });
    }

    [HttpGet("indicators")]
    public async Task<IActionResult> Indicators([FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to, CancellationToken ct)
    {
        if (await IsKilnMigrationPending(ct)) return MigrationRequired();
        if (from > to) return BadRequest("O início do período não pode ser posterior ao fim.");
        var query = VisibleFirings();
        if (from.HasValue) query = query.Where(x => x.StartedAtUtc >= from.Value.UtcDateTime);
        if (to.HasValue) query = query.Where(x => x.StartedAtUtc <= to.Value.UtcDateTime);
        var firings = await query.Include(x => x.Products).Include(x => x.Quality).AsSplitQuery().ToListAsync(ct);
        var loadedTotal = firings.Sum(x => x.LoadedTotal);
        var classifiedTotal = firings.Sum(x => x.ClassifiedTotal);
        var hasPending = firings.Any(x => x.ConferenceStatus == "Pendente");
        var percentagesValid = firings.Count > 0 && !hasPending && classifiedTotal > 0 && loadedTotal > 0;
        var totalsByProduct = firings.SelectMany(f => f.Products.Select(p => new
            {
                ProductType = p.ProductType,
                ProductName = p.ProductNameSnapshot,
                Loaded = p.Quantity,
                Classified = f.Quality.Where(q => q.ProductType == p.ProductType).Sum(q => q.Quantity)
            }))
            .GroupBy(x => new { x.ProductType, x.ProductName })
            .OrderBy(x => x.Key.ProductName)
            .Select(group => new
            {
                productType = (int)group.Key.ProductType,
                productName = group.Key.ProductName,
                pieces = group.Sum(x => x.Loaded),
                loadedPieces = group.Sum(x => x.Loaded),
                classifiedPieces = group.Sum(x => x.Classified)
            }).ToArray();
        var qualityByCategory = firings.SelectMany(x => x.Quality)
            .GroupBy(x => new { x.CategoryId, x.CategoryNameSnapshot })
            .OrderBy(x => x.Key.CategoryNameSnapshot)
            .Select(group => new
            {
                categoryId = group.Key.CategoryId,
                categoryName = group.Key.CategoryNameSnapshot,
                quantity = group.Sum(x => x.Quantity),
                percent = percentagesValid ? Math.Round(group.Sum(x => x.Quantity) * 100m / classifiedTotal, 2) : (decimal?)null
            }).ToArray();
        var durations = firings.Select(x => x.Duration).ToArray();
        var above = durations.Count(x => x > TimeSpan.FromHours(27));
        var unclassified = firings.Sum(x => x.Products.Sum(p =>
            Math.Max(0, p.Quantity - x.Quality.Where(q => q.ProductType == p.ProductType).Sum(q => q.Quantity))));
        return Ok(new
        {
            firings = firings.Count,
            totalPieces = loadedTotal,
            totalLoadedPieces = loadedTotal,
            totalClassifiedPieces = classifiedTotal,
            totalsByProduct,
            qualityByCategory,
            percentagesValid,
            classificationYieldPercent = percentagesValid ? Math.Round(classifiedTotal * 100m / loadedTotal, 2) : (decimal?)null,
            unclassifiedPieces = unclassified,
            lossesAvailable = false,
            lossPieces = (int?)null,
            lossPercent = (decimal?)null,
            above27Hours = above,
            above27Percent = durations.Length == 0 ? (decimal?)null : Math.Round(above * 100m / durations.Length, 1),
            averageDurationMinutes = durations.Length == 0 ? 0 : Math.Round(durations.Average(x => x.TotalMinutes), 0),
            pendingQuality = firings.Count(x => x.ConferenceStatus == "Pendente")
        });
    }

    [HttpPost("quality-categories")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateQualityCategory([FromBody] QualityCategoryCreateInput input, CancellationToken ct)
    {
        if (await IsKilnMigrationPending(ct)) return MigrationRequired();
        var name = input?.Name;
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 80) return BadRequest("Nome obrigatório, até 80 caracteres.");
        var normalized = name.Trim();
        if (await db.KilnQualityCategories.AnyAsync(x => x.Name.ToLower() == normalized.ToLower(), ct)) return Conflict("Categoria já cadastrada.");
        var category = new KilnQualityCategory { Name = normalized, SortOrder = await db.KilnQualityCategories.CountAsync(ct) + 1 };
        db.KilnQualityCategories.Add(category); await db.SaveChangesAsync(ct);
        return Created("", new { category.Id, category.Name });
    }

    [HttpPatch("quality-categories/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateQualityCategory(Guid id, [FromBody] QualityCategoryUpdateInput input, CancellationToken ct)
    {
        if (await IsKilnMigrationPending(ct)) return MigrationRequired();
        var name = input.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name) || name.Length > 80) return BadRequest("Nome obrigatório, até 80 caracteres.");
        var category = await db.KilnQualityCategories.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (category is null) return NotFound();
        if (await db.KilnQualityCategories.AnyAsync(x => x.Id != id && x.Name.ToLower() == name.ToLower(), ct)) return Conflict("Categoria já cadastrada.");
        category.Name = name; category.IsActive = input.IsActive; category.ModifiedOn = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to,
        [FromQuery] string? kiln, [FromQuery] Guid? burnerId, [FromQuery] int? productType,
        [FromQuery] string? durationClass, [FromQuery] string? conference, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        if (await IsKilnMigrationPending(ct)) return MigrationRequired();
        if (page < 1 || pageSize is < 1 or > 100 || from > to || kiln?.Length > 100 ||
            (durationClass is not null && durationClass is not ("Dentro do tempo" or "Acima do tempo")) ||
            (conference is not null && conference is not ("Pendente" or "Conferido"))) return BadRequest("Filtros ou paginação inválidos.");
        var query = VisibleFirings();
        if (from.HasValue) query = query.Where(x => x.StartedAtUtc >= from.Value.UtcDateTime);
        if (to.HasValue) query = query.Where(x => x.StartedAtUtc <= to.Value.UtcDateTime);
        if (!string.IsNullOrWhiteSpace(kiln)) query = query.Where(x => x.KilnName.ToLower().Contains(kiln.Trim().ToLower()));
        if (burnerId.HasValue) query = query.Where(x => x.Burners.Any(b => b.EmployeeId == burnerId));
        if (productType.HasValue && !Enum.IsDefined(typeof(ProductType), productType.Value)) return BadRequest("Tipo de produto inválido.");
        if (productType.HasValue)
        {
            var matchingTypes = KilnProductCatalog.EquivalentTypes((ProductType)productType.Value);
            query = query.Where(x => x.Products.Any(p => matchingTypes.Contains(p.ProductType)));
        }
        if (durationClass == "Dentro do tempo") query = query.Where(x => x.FinishedAtUtc <= x.StartedAtUtc.AddHours(27));
        if (durationClass == "Acima do tempo") query = query.Where(x => x.FinishedAtUtc > x.StartedAtUtc.AddHours(27));
        if (conference == "Pendente") query = query.Where(x => x.Products.Any(p => db.KilnFiringQualities.Where(q => q.FiringId == x.Id && q.ProductType == p.ProductType).Sum(q => (int?)q.Quantity) != p.Quantity));
        if (conference == "Conferido") query = query.Where(x => !x.Products.Any(p => db.KilnFiringQualities.Where(q => q.FiringId == x.Id && q.ProductType == p.ProductType).Sum(q => (int?)q.Quantity) != p.Quantity));
        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(x => x.StartedAtUtc).Skip((page - 1) * pageSize).Take(pageSize)
            .Include(x => x.Products).Include(x => x.Burners).Include(x => x.Quality).AsSplitQuery().ToListAsync(ct);
        return Ok(new { items = rows.Select(x => new { x.Id, x.KilnName, x.StartedAtUtc, x.FinishedAtUtc,
            durationMinutes = (int)x.Duration.TotalMinutes, x.DurationClass,
            x.RegisteredByName, x.DifferenceJustification,
            x.QualityConferencedByUserId, x.QualityConferencedByName, x.QualityConferencedAtUtc,
            x.QualityConferenceObservations, qualityConferenceState = x.QualityConferenceState ?? x.ConferenceStatus,
            products = x.Products.Select(p => new { productType = (int)p.ProductType, p.ProductNameSnapshot, p.Quantity }),
            burners = x.Burners.Select(b => b.EmployeeNameSnapshot),
                quality = x.Quality.Select(q => new { productType = (int)q.ProductType, q.CategoryId, q.CategoryNameSnapshot, q.Quantity }),
            loadedTotal = x.LoadedTotal, qualityTotal = x.ClassifiedTotal,
            conference = x.ConferenceStatus }), total, page, pageSize, pages = (int)Math.Ceiling(total / (double)pageSize) });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFiringInput input, CancellationToken ct)
    {
        if (await IsKilnMigrationPending(ct)) return MigrationRequired();
        var validationError = ValidateFiringInput(input);
        if (validationError is not null) return BadRequest(validationError);
        var employees = await AvailableBurners().Where(x => input.BurnerIds.Contains(x.Id)).ToListAsync(ct);
        if (employees.Count != input.BurnerIds.Distinct().Count()) return BadRequest("Queimador inválido ou inativo.");
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("nameid") ?? string.Empty;
        var display = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("unique_name") ?? "Usuário";
        if (userId.Length == 0) return Unauthorized();
        var now = DateTime.UtcNow;
        var firing = new KilnFiring { KilnName = input.KilnName.Trim(), StartedAtUtc = input.StartedAt.UtcDateTime,
            FinishedAtUtc = input.FinishedAt.UtcDateTime, Notes = input.Notes?.Trim(), RegisteredByUserId = userId,
            RegisteredByName = display, CreatedOn = now, ModifiedOn = now };
        foreach (var item in input.Products)
        {
            var productType = KilnProductCatalog.Canonicalize(item.ProductType);
            firing.Products.Add(new KilnFiringProduct { ProductType = productType, Quantity = item.Quantity, ProductNameSnapshot = KilnProductCatalog.Name(productType) });
        }
        foreach (var employee in employees)
            firing.Burners.Add(new KilnFiringBurner { EmployeeId = employee.Id, EmployeeNameSnapshot = BurnerName(employee.Id, employee.Name) });
        db.KilnFirings.Add(firing);
        await db.SaveChangesAsync(ct);
        await WriteAudit("CreatedFiring", firing.Id, "POST", ct, 201,
            $"ProductLines={firing.Products.Count};Loaded={firing.LoadedTotal};DurationMinutes={firing.Duration.TotalMinutes:0};DurationClass={firing.DurationClass};BurnerCount={firing.Burners.Count}");
        return CreatedAtAction(nameof(GetById), new { id = firing.Id }, new { firing.Id, firing.KilnName });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateFiringInput input, CancellationToken ct)
    {
        if (await IsKilnMigrationPending(ct)) return MigrationRequired();
        var validationError = ValidateFiringInput(input);
        if (validationError is not null) return BadRequest(validationError);
        var firing = await db.KilnFirings.Include(x => x.Products).Include(x => x.Burners).Include(x => x.Quality)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsCancelled, ct);
        if (firing is null || IsDemoFiring(firing)) return NotFound();
        if (firing.Quality.Count > 0 || !string.IsNullOrWhiteSpace(firing.DifferenceJustification)) return Conflict("Não é possível editar uma queima após a conferência de qualidade. Consulte o histórico e registre uma correção com a administração.");
        var previousBurners = firing.Burners.Select(burner => burner.EmployeeId).ToHashSet();
        var addedBurnerIds = input.BurnerIds.Distinct().Where(employeeId => !previousBurners.Contains(employeeId)).ToArray();
        var employees = await AvailableBurners().Where(employee => addedBurnerIds.Contains(employee.Id)).ToListAsync(ct);
        if (employees.Count != addedBurnerIds.Length) return BadRequest("Queimador inválido ou inativo.");

        firing.KilnName = input.KilnName.Trim();
        firing.StartedAtUtc = input.StartedAt.UtcDateTime;
        firing.FinishedAtUtc = input.FinishedAt.UtcDateTime;
        firing.Notes = input.Notes?.Trim();
        firing.ModifiedOn = DateTime.UtcNow;
        db.KilnFiringProducts.RemoveRange(firing.Products);
        var removedBurners = firing.Burners.Where(burner => !input.BurnerIds.Contains(burner.EmployeeId)).ToArray();
        db.KilnFiringBurners.RemoveRange(removedBurners);
        foreach (var burner in removedBurners) firing.Burners.Remove(burner);
        firing.Products = new List<KilnFiringProduct>();
        foreach (var item in input.Products)
        {
            var type = KilnProductCatalog.Canonicalize(item.ProductType);
            var product = new KilnFiringProduct { Firing = firing, ProductType = type, Quantity = item.Quantity, ProductNameSnapshot = KilnProductCatalog.Name(type) };
            db.KilnFiringProducts.Add(product);
            firing.Products.Add(product);
        }
        foreach (var employee in employees)
        {
            var burner = new KilnFiringBurner { Firing = firing, EmployeeId = employee.Id, EmployeeNameSnapshot = BurnerName(employee.Id, employee.Name) };
            db.KilnFiringBurners.Add(burner);
            firing.Burners.Add(burner);
        }
        await db.SaveChangesAsync(ct);
        await WriteAudit("UpdatedFiring", firing.Id, "PUT", ct, 204,
            $"ProductLines={firing.Products.Count};Loaded={firing.LoadedTotal};DurationMinutes={firing.Duration.TotalMinutes:0};BurnerCount={firing.Burners.Count}");
        return NoContent();
    }

    [HttpPut("{id:guid}/quality")]
    public async Task<IActionResult> UpdateQuality(Guid id, [FromBody] QualityUpdateInput input, CancellationToken ct)
    {
        if (await IsKilnMigrationPending(ct)) return MigrationRequired();
        var firing = await db.KilnFirings.Include(x => x.Products).Include(x => x.Quality).FirstOrDefaultAsync(x => x.Id == id && !x.IsCancelled, ct);
        if (firing is null) return NotFound();
        if (!firing.IsFinishedAt(DateTime.UtcNow)) return BadRequest("A conferência só pode ser registrada depois da finalização e abertura do forno.");
        if (input?.Items is null || input.Items.Count == 0 || input.Items.Any(x => x.Quantity < 0 || !Enum.IsDefined(x.ProductType)) || input.Items.GroupBy(x => (x.ProductType, x.CategoryId)).Any(x => x.Count() > 1) ||
            input.Items.Any(x => !firing.Products.Any(p => p.ProductType == x.ProductType))) return BadRequest("Informe classificações válidas por produto.");
        if (firing.Products.Any(product => !input.Items.Any(item => item.ProductType == product.ProductType)))
            return BadRequest("Informe ao menos uma categoria para cada produto carregado. Use zero quando a quantidade da categoria for zero.");
        foreach (var group in input.Items.GroupBy(x => x.ProductType))
        {
            var loaded = firing.Products.Single(x => x.ProductType == group.Key).Quantity;
            if (group.Sum(x => x.Quantity) > loaded)
                return BadRequest($"A quantidade classificada de {ProductName(group.Key)} não pode passar das {loaded:N0} peças carregadas.");
        }
        var justificationText = input.DifferenceJustification?.Trim();
        if (justificationText?.Length > 1000) return BadRequest("A justificativa pode ter no máximo 1000 caracteres.");
        var observations = input.Observations?.Trim();
        if (observations?.Length > 1000) return BadRequest("As observações podem ter no máximo 1000 caracteres.");
        var hasUnreconciledProduct = firing.Products.Any(product =>
            input.Items.Where(item => item.ProductType == product.ProductType).Sum(item => item.Quantity) != product.Quantity);
        var categories = input.Items.Select(x => x.CategoryId).Distinct().ToArray();
        var categoryOptions = await db.KilnQualityCategories.Where(x => categories.Contains(x.Id) && x.IsActive).Select(x => new { x.Id, x.Name }).ToListAsync(ct);
        if (categoryOptions.Count != categories.Length) return BadRequest("Categoria de qualidade inativa ou inválida.");
        var classifiedBefore = firing.Quality.Sum(x => x.Quantity);
        var previousState = firing.ConferenceStatus;
        var now = DateTime.UtcNow;
        var state = hasUnreconciledProduct ? "Pendente" : "Conferido";
        var revisionNumber = (await db.KilnFiringQualityRevisions.Where(x => x.FiringId == firing.Id)
            .Select(x => (int?)x.RevisionNumber).MaxAsync(ct) ?? 0) + 1;
        var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("nameid");
        var actorName = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("unique_name") ?? "Usuário autenticado";
        var revision = new KilnFiringQualityRevision
        {
            FiringId = firing.Id,
            RevisionNumber = revisionNumber,
            ConferencedByUserId = actorId,
            ConferencedByName = actorName,
            ConferencedAtUtc = now,
            Observations = string.IsNullOrWhiteSpace(observations) ? null : observations,
            DifferenceJustification = string.IsNullOrWhiteSpace(justificationText) ? null : justificationText,
            State = state,
            LoadedTotal = firing.LoadedTotal,
            ClassifiedTotal = input.Items.Sum(x => x.Quantity),
            UnclassifiedTotal = Math.Max(0, firing.LoadedTotal - input.Items.Sum(x => x.Quantity))
        };
        foreach (var item in input.Items)
        {
            var product = firing.Products.Single(x => x.ProductType == item.ProductType);
            var categoryName = categoryOptions.Single(x => x.Id == item.CategoryId).Name;
            revision.Items.Add(new KilnFiringQualityRevisionItem
            {
                ProductType = item.ProductType,
                ProductNameSnapshot = product.ProductNameSnapshot,
                CategoryId = item.CategoryId,
                CategoryNameSnapshot = categoryName,
                Quantity = item.Quantity
            });
        }
        db.KilnFiringQualityRevisions.Add(revision);
        db.KilnFiringQualities.RemoveRange(firing.Quality);
        firing.Quality = new List<KilnFiringQuality>();
        foreach (var item in input.Items)
        {
            var quality = new KilnFiringQuality { Firing = firing, ProductType = item.ProductType, CategoryId = item.CategoryId, CategoryNameSnapshot = categoryOptions.Single(x => x.Id == item.CategoryId).Name, Quantity = item.Quantity };
            db.KilnFiringQualities.Add(quality);
            firing.Quality.Add(quality);
        }
        firing.DifferenceJustification = string.IsNullOrWhiteSpace(justificationText) ? null : justificationText;
        firing.QualityConferencedByUserId = actorId;
        firing.QualityConferencedByName = actorName;
        firing.QualityConferencedAtUtc = now;
        firing.QualityConferenceObservations = string.IsNullOrWhiteSpace(observations) ? null : observations;
        firing.QualityConferenceState = state;
        firing.ModifiedOn = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await WriteAudit("UpdatedQuality", firing.Id, "PUT", ct, 200,
            $"Revision={revisionNumber};Before={classifiedBefore};After={firing.ClassifiedTotal};Difference={firing.UnclassifiedTotal};Previous={previousState};Conference={firing.ConferenceStatus}");
        return Ok(new { status = state, revision = revisionNumber, loaded = firing.LoadedTotal,
            classified = firing.ClassifiedTotal, unclassified = firing.UnclassifiedTotal,
            difference = firing.LoadedTotal - firing.ClassifiedTotal, conferencedBy = actorName, conferencedAtUtc = now });
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelFiringInput input, CancellationToken ct)
    {
        if (await IsKilnMigrationPending(ct)) return MigrationRequired();
        var firing = await db.KilnFirings.FirstOrDefaultAsync(x => x.Id == id && !x.IsCancelled &&
            !x.KilnName.ToLower().Contains("teste") && !x.RegisteredByName.ToLower().Contains("teste") &&
            (x.Notes == null || !x.Notes.ToLower().Contains("[demo]")), ct);
        if (firing is null) return NotFound();
        var reason = input?.Reason?.Trim();
        if (string.IsNullOrWhiteSpace(reason) || reason.Length > 500) return BadRequest("Justificativa obrigatória (até 500 caracteres).");
        firing.IsCancelled = true; firing.DifferenceJustification = $"Cancelada: {reason}"; firing.ModifiedOn = DateTime.UtcNow;
        await db.SaveChangesAsync(ct); await WriteAudit("CancelledFiring", id, "POST", ct, 204, "ReasonProvided=true");
        return NoContent();
    }

    [HttpGet("report.pdf")]
    public async Task<IActionResult> ExportReport([FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to, CancellationToken ct)
    {
        if (await IsKilnMigrationPending(ct)) return MigrationRequired();
        if (from > to) return BadRequest("Período inválido.");
        var query = VisibleFirings();
        if (from.HasValue) query = query.Where(x => x.StartedAtUtc >= from.Value.UtcDateTime);
        if (to.HasValue) query = query.Where(x => x.StartedAtUtc <= to.Value.UtcDateTime);
        var firings = await query.Include(x => x.Products).Include(x => x.Burners).Include(x => x.Quality).ThenInclude(x => x.Category).OrderBy(x => x.StartedAtUtc).ToListAsync(ct);
        var report = BuildReportDocument("Relatório de Controle de Fornos", from, to, firings);
        var logoPath = Path.Combine(environment.WebRootPath ?? string.Empty, "base", "Logo.png");
        return File(pdf.BuildKilnFiringReportPdf(report, logoPath), "application/pdf", "relatorio-fornos.pdf");
    }

    [HttpGet("report.xlsx")]
    public async Task<IActionResult> ExportSpreadsheet([FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to, CancellationToken ct)
    {
        if (await IsKilnMigrationPending(ct)) return MigrationRequired();
        if (from > to) return BadRequest("A data inicial do período precisa ser anterior ou igual à data final.");
        var query = VisibleFirings();
        if (from.HasValue) query = query.Where(x => x.StartedAtUtc >= from.Value.UtcDateTime);
        if (to.HasValue) query = query.Where(x => x.StartedAtUtc <= to.Value.UtcDateTime);
        var firings = await query.Include(x => x.Products).Include(x => x.Burners).Include(x => x.Quality)
            .OrderBy(x => x.StartedAtUtc).ToListAsync(ct);

        var fileName = $"controle-fornos_{from?.ToString("yyyy-MM-dd") ?? "inicio"}_a_{to?.ToString("yyyy-MM-dd") ?? "hoje"}.xlsx";
        var logoPath = Path.Combine(environment.WebRootPath ?? string.Empty, "base", "Logo.png");
        var logo = System.IO.File.Exists(logoPath) ? await System.IO.File.ReadAllBytesAsync(logoPath, ct) : null;
        return File(spreadsheet.BuildKilnWorkbook(BuildWorkbookSheets(firings, from, to), logo),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    [HttpGet("{id:guid}/report.pdf")]
    public async Task<IActionResult> ExportFiringReport(Guid id, CancellationToken ct)
    {
        if (await IsKilnMigrationPending(ct)) return MigrationRequired();
        var firing = await VisibleFirings().Include(x => x.Products).Include(x => x.Burners)
            .Include(x => x.Quality).ThenInclude(x => x.Category).FirstOrDefaultAsync(x => x.Id == id && !x.IsCancelled, ct);
        if (firing is null) return NotFound();
        var report = BuildReportDocument($"Relatório da queima · {firing.KilnName}", null, null, [firing]);
        var logoPath = Path.Combine(environment.WebRootPath ?? string.Empty, "base", "Logo.png");
        return File(pdf.BuildKilnFiringReportPdf(report, logoPath), "application/pdf", $"queima-{firing.Id:N}.pdf");
    }

    private static KilnFiringReportDocument BuildReportDocument(string title, DateTimeOffset? from, DateTimeOffset? to, IReadOnlyCollection<KilnFiring> firings)
    {
        var culture = CultureInfo.GetCultureInfo("pt-BR");
        var localZone = TimeZoneInfo.FindSystemTimeZoneById("America/Fortaleza");
        DateTime Local(DateTime utc) => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), localZone);
        var rows = firings.SelectMany(firing => firing.Products.Select(product =>
        {
            var quality = firing.Quality.Where(x => x.ProductType == product.ProductType).ToArray();
            var total = quality.Sum(x => x.Quantity);
            var status = total == product.Quantity ? "Conferido" : "Pendente";
            var breakdown = quality.Length == 0 ? "Sem classificação" : string.Join(" · ", quality.Select(x => $"{x.CategoryNameSnapshot}: {x.Quantity.ToString("N0", culture)}"));
            if (firing.QualityConferencedAtUtc.HasValue)
                breakdown += $"\nConferência: {firing.QualityConferencedByName ?? "Usuário legado não identificado"} · {Local(firing.QualityConferencedAtUtc.Value):dd/MM/yyyy HH:mm}";
            if (!string.IsNullOrWhiteSpace(firing.QualityConferenceObservations))
                breakdown += $"\nObservações: {firing.QualityConferenceObservations}";
            return new KilnReportRow(firing.Id.ToString(), firing.KilnName,
                Local(firing.StartedAtUtc).ToString("dd/MM/yyyy HH:mm", culture), Local(firing.FinishedAtUtc).ToString("dd/MM/yyyy HH:mm", culture),
                $"{(int)firing.Duration.TotalHours}h {firing.Duration.Minutes:00}min · {firing.DurationClass}", product.ProductNameSnapshot,
                product.Quantity, breakdown, status, string.Join(", ", firing.Burners.Select(x => x.EmployeeNameSnapshot)));
        })).ToArray();
        var productTotals = firings.SelectMany(x => x.Products).GroupBy(x => x.ProductNameSnapshot)
            .OrderBy(x => x.Key).Select(x => $"{x.Key}: {x.Sum(p => p.Quantity).ToString("N0", culture)} peças");
        var summary = new List<string>
        {
            $"Queimas: {firings.Count} · Peças carregadas: {firings.Sum(x => x.LoadedTotal).ToString("N0", culture)} · Acima de 27h: {firings.Count(x => x.Duration.TotalHours > 27)} · Conferências pendentes: {firings.Count(x => x.ConferenceStatus == "Pendente")}",
            $"Duração média: {(firings.Count == 0 ? 0 : firings.Average(x => x.Duration.TotalMinutes) / 60):0.00} horas",
            $"Totais por produto: {(productTotals.Any() ? string.Join(" · ", productTotals) : "sem produção no período") }",
            $"Peças classificadas após abertura: {firings.Sum(x => x.ClassifiedTotal).ToString("N0", culture)}",
            $"Peças sem classificação (pendências): {firings.Sum(x => x.UnclassifiedTotal).ToString("N0", culture)}",
            $"Percentuais de qualidade: {(firings.Count > 0 && firings.All(x => x.ConferenceStatus == "Conferido") && firings.Sum(x => x.ClassifiedTotal) > 0 ? "disponíveis somente nos registros conciliados; consultar categorias detalhadas" : "indisponíveis porque há conferências pendentes ou ausência de denominador")}",
            "Perdas/quebras: não mensuradas; as categorias ainda dependem de validação da empresa."
        };
        foreach (var category in firings.SelectMany(x => x.Quality).GroupBy(x => x.CategoryNameSnapshot).OrderBy(x => x.Key))
        {
            var percent = firings.Count > 0 && firings.All(x => x.ConferenceStatus == "Conferido") && firings.Sum(x => x.ClassifiedTotal) > 0
                ? $" ({category.Sum(x => x.Quantity) * 100m / firings.Sum(x => x.ClassifiedTotal):0.00}%)" : string.Empty;
            summary.Add($"Qualidade · {category.Key}: {category.Sum(x => x.Quantity).ToString("N0", culture)} peças{percent}");
        }
        var filters = new List<string>();
        if (from.HasValue) filters.Add($"Início a partir de {Local(from.Value.UtcDateTime):dd/MM/yyyy HH:mm}");
        if (to.HasValue) filters.Add($"Até {Local(to.Value.UtcDateTime):dd/MM/yyyy HH:mm}");
        return new KilnFiringReportDocument(title,
            $"{(from.HasValue ? Local(from.Value.UtcDateTime).ToString("dd/MM/yyyy", culture) : "Desde o início")} a {(to.HasValue ? Local(to.Value.UtcDateTime).ToString("dd/MM/yyyy", culture) : "Até hoje")}",
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, localZone), filters, summary, rows);
    }

    private static IReadOnlyList<SpreadsheetReportSheet> BuildWorkbookSheets(IReadOnlyCollection<KilnFiring> firings, DateTimeOffset? from, DateTimeOffset? to)
    {
        var culture = CultureInfo.GetCultureInfo("pt-BR");
        var zone = TimeZoneInfo.FindSystemTimeZoneById("America/Fortaleza");
        DateTime Local(DateTime utc) => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), zone);
        var generated = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone);
        var period = $"{(from.HasValue ? Local(from.Value.UtcDateTime).ToString("dd/MM/yyyy", culture) : "Desde o início")} a {(to.HasValue ? Local(to.Value.UtcDateTime).ToString("dd/MM/yyyy", culture) : "Até hoje")}";
        var percentagesValid = firings.Count > 0 && firings.All(x => x.ConferenceStatus == "Conferido") && firings.Sum(x => x.ClassifiedTotal) > 0;
        var detailRows = new List<object?[]>
        {
            new object?[] { "Relatório detalhado de queimas" }, new object?[] { "Período", period }, new object?[] { "Gerado em", generated },
            new object?[] { "Identificador", "Forno", "Início", "Finalização", "Duração (horas)", "Limite de 27h", "Produto", "Peças carregadas", "Qualidade pós-abertura", "Conferência", "Queimadores", "Conferido por", "Data da conferência", "Observações da conferência" }
        };
        foreach (var firing in firings)
        foreach (var product in firing.Products)
        {
            var quality = firing.Quality.Where(x => x.ProductType == product.ProductType).ToArray();
            var classified = quality.Sum(x => x.Quantity);
            var reconciled = classified == product.Quantity;
            detailRows.Add(new object?[] { firing.Id.ToString(), firing.KilnName, Local(firing.StartedAtUtc), Local(firing.FinishedAtUtc),
                Math.Round(firing.Duration.TotalHours, 2), firing.DurationClass, product.ProductNameSnapshot, product.Quantity,
                string.Join(" · ", quality.Select(x => $"{x.CategoryNameSnapshot}: {x.Quantity.ToString("N0", culture)}")),
                reconciled ? "Conferido" : "Pendente", string.Join(", ", firing.Burners.Select(x => x.EmployeeNameSnapshot)),
                firing.QualityConferencedByName ?? "", firing.QualityConferencedAtUtc.HasValue ? Local(firing.QualityConferencedAtUtc.Value) : null,
                firing.QualityConferenceObservations ?? "" });
        }

        var qualityRows = new List<object?[]>
        {
            new object?[] { "Conferência de qualidade após abertura" }, new object?[] { "Período", period }, new object?[] { "Gerado em", generated },
            new object?[] { "Identificador", "Forno", "Data da queima", "Produto", "Peças carregadas", "Categoria", "Peças classificadas", "Estado", "Conferido por", "Data da conferência", "Observações" }
        };
        foreach (var firing in firings)
        foreach (var product in firing.Products)
        {
            var rows = firing.Quality.Where(x => x.ProductType == product.ProductType).ToArray();
            if (rows.Length == 0)
                qualityRows.Add(new object?[] { firing.Id.ToString(), firing.KilnName, Local(firing.StartedAtUtc), product.ProductNameSnapshot,
                    product.Quantity, "Sem classificação", 0, "Pendente", firing.QualityConferencedByName ?? "",
                    firing.QualityConferencedAtUtc.HasValue ? Local(firing.QualityConferencedAtUtc.Value) : null, firing.QualityConferenceObservations ?? "" });
            foreach (var quality in rows)
                qualityRows.Add(new object?[] { firing.Id.ToString(), firing.KilnName, Local(firing.StartedAtUtc), product.ProductNameSnapshot,
                    product.Quantity, quality.CategoryNameSnapshot, quality.Quantity, firing.ConferenceStatus,
                    firing.QualityConferencedByName ?? "", firing.QualityConferencedAtUtc.HasValue ? Local(firing.QualityConferencedAtUtc.Value) : null,
                    firing.QualityConferenceObservations ?? "" });
        }

        var lastDetail = Math.Max(5, detailRows.Count);
        var lastQuality = Math.Max(5, qualityRows.Count);
        var summaryRows = new List<object?[]>
        {
            new object?[] { "", "", "", "Relatório de Controle de Fornos" }, new object?[] { "", "", "", "Cerâmica Canelas" },
            new object?[] { "", "", "", "Período", period }, new object?[] { "", "", "", "Gerado em", generated }, new object?[] { "" },
            new object?[] { "Indicador", "Valor" }, new object?[] { "Queimas", firings.Count },
            new object?[] { "Peças carregadas", new SpreadsheetFormula($"SUM('Queimas'!H5:H{lastDetail})", firings.Sum(x => x.LoadedTotal)) },
            new object?[] { "Peças classificadas", new SpreadsheetFormula($"SUM('Qualidade'!G5:G{lastQuality})", firings.Sum(x => x.ClassifiedTotal)) },
            new object?[] { "Conferências pendentes", firings.Count(x => x.ConferenceStatus == "Pendente") },
            new object?[] { "Rendimento", percentagesValid ? new SpreadsheetFormula("IFERROR(B9/B8,0)", (double)firings.Sum(x => x.ClassifiedTotal) / firings.Sum(x => x.LoadedTotal), true) : "Indisponível: existem conferências pendentes" },
            new object?[] { "Perdas/quebras", "Não mensuradas; categorias aguardam validação da empresa" },
            new object?[] { "Total por produto", "Peças carregadas" }
        };
        var loadedProducts = firings.SelectMany(x => x.Products).GroupBy(x => x.ProductNameSnapshot).OrderBy(x => x.Key).ToArray();
        foreach (var product in loadedProducts)
        {
            var rowNumber = summaryRows.Count + 1;
            var total = product.Sum(x => x.Quantity);
            summaryRows.Add(new object?[] { product.Key, new SpreadsheetFormula($"SUMIF('Queimas'!G5:G{lastDetail},A{rowNumber},'Queimas'!H5:H{lastDetail})", total) });
        }
        summaryRows.Add(new object?[] { "Total por categoria", "Peças classificadas", "Percentual da produção conferida" });
        foreach (var category in firings.SelectMany(x => x.Quality).GroupBy(x => x.CategoryNameSnapshot).OrderBy(x => x.Key))
        {
            var rowNumber = summaryRows.Count + 1;
            var total = category.Sum(x => x.Quantity);
            var amount = new SpreadsheetFormula($"SUMIF('Qualidade'!F5:F{lastQuality},A{rowNumber},'Qualidade'!G5:G{lastQuality})", total);
            object? percentage = percentagesValid
                ? new SpreadsheetFormula($"IFERROR(B{rowNumber}/$B$9,0)", (double)total / firings.Sum(x => x.ClassifiedTotal), true)
                : "Indisponível enquanto houver pendências";
            summaryRows.Add(new object?[] { category.Key, amount, percentage });
        }

        static IReadOnlyList<IReadOnlyList<object?>> AsRows(IEnumerable<object?[]> rows) => rows.Select(x => (IReadOnlyList<object?>)x).ToArray();
        return
        [
            new SpreadsheetReportSheet("Resumo", AsRows(summaryRows), 6, [34, 24, 34, 32, 24], false),
            new SpreadsheetReportSheet("Queimas", AsRows(detailRows), 4, [38, 24, 21, 21, 17, 24, 32, 20, 52, 18, 34, 26, 22, 42]),
            new SpreadsheetReportSheet("Qualidade", AsRows(qualityRows), 4, [38, 24, 21, 32, 20, 26, 22, 18, 26, 22, 42])
        ];
    }

    private Task WriteAudit(string action, Guid id, string method, CancellationToken ct, int statusCode, string? context = null) => audit.WriteAsync(new AuditEventData(
        "BusinessAudit", action, "Success", "Info", "Produção", "KilnFirings", id.ToString(),
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("nameid"),
        User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("unique_name"), DateTime.UtcNow,
        HttpContext.Connection.RemoteIpAddress?.ToString(), method, "api/kiln-firings", statusCode,
        HttpContext.TraceIdentifier, context), ct);

    private static string ProductName(ProductType value) => typeof(ProductType).GetMember(value.ToString()).First()
        .GetCustomAttribute<DescriptionAttribute>()?.Description ?? value.ToString();

    private IQueryable<KilnFiring> VisibleFirings() => db.KilnFirings.AsNoTracking().Where(x => !x.IsCancelled &&
        !x.KilnName.ToLower().Contains("teste") && !x.RegisteredByName.ToLower().Contains("teste") &&
        (x.Notes == null || !x.Notes.ToLower().Contains("[demo]")));

    private static bool IsDemoFiring(KilnFiring firing) =>
        firing.KilnName.ToLower().Contains("teste") || firing.RegisteredByName.ToLower().Contains("teste") ||
        firing.Notes?.ToLower().Contains("[demo]") == true;

    private static string? ValidateFiringInput(CreateFiringInput input)
    {
        if (input is null) return "Informe os dados da queima.";
        if (string.IsNullOrWhiteSpace(input.KilnName) || input.KilnName.Length > 100) return "Informe o nome do forno (até 100 caracteres).";
        if (input.FinishedAt <= input.StartedAt) return "A finalização precisa ser posterior ao início da queima.";
        if (input.Products is null || input.Products.Count == 0 || input.Products.Any(x => x.Quantity <= 0 || !Enum.IsDefined(x.ProductType))) return "Adicione ao menos um produto com uma quantidade maior que zero.";
        if (input.Products.Select(x => KilnProductCatalog.Canonicalize(x.ProductType)).Distinct().Count() != input.Products.Count) return "Cada tipo de produto deve aparecer uma única vez. Ajuste a quantidade na linha existente.";
        if (input.BurnerIds is null || input.BurnerIds.Count == 0) return "Selecione ao menos um queimador participante.";
        return null;
    }

    private async Task<bool> IsKilnMigrationPending(CancellationToken ct)
    {
        var pending = await db.Database.GetPendingMigrationsAsync(ct);
        return pending.Contains(KilnMigrationId, StringComparer.Ordinal) ||
            pending.Contains(QualityHistoryMigrationId, StringComparer.Ordinal);
    }

    private ObjectResult MigrationRequired() => StatusCode(StatusCodes.Status503ServiceUnavailable,
        new { message = "O Controle de Fornos aguarda a aplicação das migrations do módulo neste ambiente." });
}

/// <summary>Adapta o catálogo de produtos já usado em Vendas sem alterar suas opções ou regras.</summary>
public static class KilnProductCatalog
{
    private static readonly IReadOnlyDictionary<ProductType, ProductType> CanonicalTypes = new Dictionary<ProductType, ProductType>
    {
        [ProductType.Brick2_6] = ProductType.Brick1_6,
        [ProductType.Brick2_8] = ProductType.Brick1_8,
        [ProductType.RoofTile2] = ProductType.RoofTile1,
        [ProductType.Caldeado6] = ProductType.Brick1_6,
        [ProductType.Caldeado8] = ProductType.Brick1_8,
        [ProductType.Caldeado9] = ProductType.Block9
    };

    public static ProductType Canonicalize(ProductType type) => CanonicalTypes.GetValueOrDefault(type, type);

    public static ProductType[] EquivalentTypes(ProductType canonicalType) =>
        Enum.GetValues<ProductType>().Where(type => Canonicalize(type) == Canonicalize(canonicalType)).ToArray();

    public static object[] Options() => Enum.GetValues<ProductType>()
        .Where(type => Canonicalize(type) == type)
        .Select(type => new { Id = (int)type, Name = Name(type) })
        .Cast<object>()
        .ToArray();

    public static string Name(ProductType type) => type switch
    {
        ProductType.Brick1_6 => "Tijolos 06 furos",
        ProductType.Brick1_8 => "Tijolos 08 furos",
        ProductType.RoofTile1 => "Telhas",
        _ => typeof(ProductType).GetMember(type.ToString()).First().GetCustomAttribute<DescriptionAttribute>()?.Description ?? type.ToString()
    };
}
