using System.Globalization;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace CeramicaCanelas.WebApi.ModelBinders;

public sealed class FlexibleDecimalModelBinder : IModelBinder
{
    public Task BindModelAsync(ModelBindingContext context)
    {
        var result = context.ValueProvider.GetValue(context.ModelName);
        if (result == ValueProviderResult.None) return Task.CompletedTask;
        context.ModelState.SetModelValue(context.ModelName, result);
        var value = result.FirstValue?.Trim();
        if (string.IsNullOrEmpty(value))
        {
            if (Nullable.GetUnderlyingType(context.ModelType) is not null) context.Result = ModelBindingResult.Success(null);
            return Task.CompletedTask;
        }
        var culture = value.Contains(',') && !value.Contains('.') ? CultureInfo.GetCultureInfo("pt-BR") : CultureInfo.InvariantCulture;
        if (decimal.TryParse(value, NumberStyles.Number, culture, out var parsed)) context.Result = ModelBindingResult.Success(parsed);
        else context.ModelState.TryAddModelError(context.ModelName, $"O valor '{value}' nao e um numero decimal valido.");
        return Task.CompletedTask;
    }
}
