using System.Threading.RateLimiting;



var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("PerIpPolicy", context =>
    {
        var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(remoteIp, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 60,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        });
    });
    options.RejectionStatusCode = 429;
});

//permite chamadas do front-end
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Configura cliente HTTP para n8n
var n8nUrl = builder.Configuration.GetValue<string>("N8n:WebhookUrl");
builder.Services.AddHttpClient("n8n", client =>
{
    if (!string.IsNullOrEmpty(n8nUrl))
        client.BaseAddress = new Uri(n8nUrl);
    client.Timeout = TimeSpan.FromSeconds(30);
});

var app = builder.Build();

app.UseHttpsRedirection();

app.UseCors();

app.UseRateLimiter();

app.MapControllers();

app.Run();
