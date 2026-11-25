using System.Globalization;
using System.Runtime.InteropServices;

namespace CeramicaCanelas.WebApi.Monitoring;

public readonly record struct CpuCounters(ulong Total, ulong Idle)
{
    public static double? Usage(CpuCounters previous, CpuCounters current)
    {
        if (current.Total <= previous.Total || current.Idle < previous.Idle) return null;
        var total = current.Total - previous.Total;
        var idle = current.Idle - previous.Idle;
        return idle <= total ? Math.Round(100d * (total - idle) / total, 1) : null;
    }
}

public sealed record MemoryMeasurement(long TotalBytes, long UsedBytes, long AvailableBytes, double UsagePercent)
{
    internal static MemoryMeasurement? FromBytes(long total, long available) =>
        total > 0 && available >= 0 && available <= total
            ? new(total, total - available, available, Math.Round(100d * (total - available) / total, 1))
            : null;
}

public interface IHostMetricsProvider
{
    string Source { get; }
    ValueTask<CpuCounters?> ReadCpu(CancellationToken cancellationToken);
    ValueTask<MemoryMeasurement?> ReadMemory(CancellationToken cancellationToken);
}

internal sealed class LinuxHostMetrics : IHostMetricsProvider
{
    public string Source => "linux";

    public async ValueTask<CpuCounters?> ReadCpu(CancellationToken cancellationToken)
    {
        // /proc/stat starts with the aggregate CPU line. Read it without scanning per-core data.
        using var reader = File.OpenText("/proc/stat");
        return ParseCpu(await reader.ReadLineAsync(cancellationToken));
    }

    public async ValueTask<MemoryMeasurement?> ReadMemory(CancellationToken cancellationToken) =>
        ParseMemory(await File.ReadAllLinesAsync("/proc/meminfo", cancellationToken));

    internal static CpuCounters? ParseCpu(string? line)
    {
        var fields = line?.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        if (fields is null || fields.Length < 5 || fields[0] != "cpu") return null;

        ulong total = 0, idle = 0;
        // guest and guest_nice are included in user and nice.
        for (var index = 1; index < Math.Min(fields.Length, 9); index++)
        {
            if (!ulong.TryParse(fields[index], NumberStyles.None, CultureInfo.InvariantCulture, out var ticks)
                || ulong.MaxValue - total < ticks) return null;
            total += ticks;
            if (index is 4 or 5) idle += ticks;
        }
        return new(total, idle);
    }

    internal static MemoryMeasurement? ParseMemory(IEnumerable<string> lines)
    {
        long? total = null, available = null;
        foreach (var line in lines)
        {
            var separator = line.IndexOf(':');
            if (separator < 0) continue;
            var label = line[..separator];
            if (label is not ("MemTotal" or "MemAvailable")) continue;
            var fields = line[(separator + 1)..].Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
            if (fields.Length != 2 || fields[1] != "kB" ||
                !long.TryParse(fields[0], NumberStyles.None, CultureInfo.InvariantCulture, out var kib) ||
                kib > long.MaxValue / 1024) return null;
            if (label == "MemTotal") total = kib * 1024;
            else available = kib * 1024;
        }
        return total.HasValue && available.HasValue ? MemoryMeasurement.FromBytes(total.Value, available.Value) : null;
    }
}

internal sealed class WindowsHostMetrics : IHostMetricsProvider
{
    public string Source => "windows";

    public ValueTask<CpuCounters?> ReadCpu(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!GetSystemTimes(out var idle, out var kernel, out var user))
            return ValueTask.FromResult<CpuCounters?>(null);
        return ValueTask.FromResult<CpuCounters?>(new(kernel.Ticks + user.Ticks, idle.Ticks));
    }

    public ValueTask<MemoryMeasurement?> ReadMemory(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var memory = new MemoryStatus { Length = (uint)Marshal.SizeOf<MemoryStatus>() };
        return ValueTask.FromResult(GlobalMemoryStatusEx(ref memory) &&
            memory.TotalPhysical <= long.MaxValue && memory.AvailablePhysical <= long.MaxValue
                ? MemoryMeasurement.FromBytes((long)memory.TotalPhysical, (long)memory.AvailablePhysical) : null);
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct FileTime
    {
        public uint Low, High;
        public readonly ulong Ticks => ((ulong)High << 32) | Low;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MemoryStatus
    {
        public uint Length, MemoryLoad;
        public ulong TotalPhysical, AvailablePhysical, TotalPageFile, AvailablePageFile,
            TotalVirtual, AvailableVirtual, AvailableExtendedVirtual;
    }

    [DllImport("kernel32.dll", ExactSpelling = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetSystemTimes(out FileTime idle, out FileTime kernel, out FileTime user);

    [DllImport("kernel32.dll", ExactSpelling = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GlobalMemoryStatusEx(ref MemoryStatus memory);
}

internal sealed class UnavailableHostMetrics : IHostMetricsProvider
{
    public string Source => "unavailable";
    public ValueTask<CpuCounters?> ReadCpu(CancellationToken cancellationToken) => ValueTask.FromResult<CpuCounters?>(null);
    public ValueTask<MemoryMeasurement?> ReadMemory(CancellationToken cancellationToken) => ValueTask.FromResult<MemoryMeasurement?>(null);
}
