using CeramicaCanelas.WebApi.Monitoring;
using Xunit;

namespace CeramicaCanelas.Tests.Monitoring;

public sealed class HostMetricsTests
{
    [Fact]
    public void Aggregate_cpu_uses_counter_deltas_and_ignores_guest_duplicates()
    {
        var first = LinuxHostMetrics.ParseCpu("cpu 100 20 30 300 50 4 6 10 25 5");
        var second = LinuxHostMetrics.ParseCpu("cpu 140 20 40 340 60 4 6 10 50 5");

        Assert.Equal(new CpuCounters(520, 350), first);
        Assert.Equal(new CpuCounters(620, 400), second);
        Assert.Equal(50d, CpuCounters.Usage(first!.Value, second!.Value));
        Assert.Equal(0d, CpuCounters.Usage(new(100, 60), new(200, 160)));
        Assert.Equal(100d, CpuCounters.Usage(new(100, 60), new(200, 60)));
    }

    [Theory]
    [InlineData(100, 60)]
    [InlineData(99, 60)]
    [InlineData(110, 59)]
    [InlineData(110, 80)]
    public void Cpu_rejects_invalid_deltas(int total, int idle) =>
        Assert.Null(CpuCounters.Usage(new(100, 60), new((ulong)total, (ulong)idle)));

    [Theory]
    [InlineData(null)]
    [InlineData("cpu0 100 20 30 300")]
    [InlineData("cpu 100 a 30 300")]
    [InlineData("cpu 18446744073709551615 20 30 300")]
    public void Cpu_rejects_invalid_readings(string? line) => Assert.Null(LinuxHostMetrics.ParseCpu(line));

    [Fact]
    public void Linux_ram_uses_available_and_converts_kibibytes_to_bytes()
    {
        var memory = LinuxHostMetrics.ParseMemory(["MemTotal: 8192 kB", "MemFree: 256 kB", "MemAvailable: 2048 kB"]);
        Assert.Equal(new MemoryMeasurement(8_388_608, 6_291_456, 2_097_152, 75), memory);
        Assert.Equal(100d, LinuxHostMetrics.ParseMemory(["MemTotal: 8192 kB", "MemAvailable: 0 kB"])?.UsagePercent);
    }

    [Theory]
    [InlineData("MemFree: 1 kB")]
    [InlineData("MemAvailable: -1 kB")]
    [InlineData("MemAvailable: 2 MB")]
    [InlineData("MemAvailable: 8193 kB")]
    [InlineData("MemAvailable: 9223372036854775807 kB")]
    public void Linux_ram_rejects_unusable_readings(string line) =>
        Assert.Null(LinuxHostMetrics.ParseMemory(["MemTotal: 8192 kB", line]));

    [Fact]
    public async Task Native_provider_returns_actual_cpu_and_memory_when_supported()
    {
        IHostMetricsProvider? provider = OperatingSystem.IsWindows() ? new WindowsHostMetrics()
            : OperatingSystem.IsLinux() ? new LinuxHostMetrics() : null;
        if (provider is null) return;

        var cpu = await provider.ReadCpu(CancellationToken.None);
        var memory = await provider.ReadMemory(CancellationToken.None);
        Assert.True(cpu is { Total: > 0 } && cpu.Value.Idle <= cpu.Value.Total);
        Assert.NotNull(memory);
        Assert.True(memory.TotalBytes > 0);
        Assert.Equal(memory.TotalBytes, memory.UsedBytes + memory.AvailableBytes);
        Assert.InRange(memory.UsagePercent, 0d, 100d);
    }
}
