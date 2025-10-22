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
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins(
            "http://127.0.0.1:5500",
            "http://localhost:5500",
            "http://127.0.0.1:5501",
            "http://localhost:5501",
            "http://127.0.0.1:5502",
            "http://localhost:5502"
        )
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});

// Configura cliente HTTP para n8n
builder.Services.AddHttpClient("n8n", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});

var app = builder.Build();

// Ativa o CORS antes de qualquer outro middleware
app.UseCors("AllowAll");

app.UseRateLimiter();

app.MapControllers();

app.Run();
