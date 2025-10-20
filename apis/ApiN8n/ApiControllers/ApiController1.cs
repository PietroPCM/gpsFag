using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.ComponentModel.DataAnnotations;

namespace ApiN8n.ApiControllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ApiController1 : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<ApiController1> _logger;

        public ApiController1(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<ApiController1> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        public class ChatRequest
        {
            [Required(AllowEmptyStrings = false)]
            public string? Text { get; set; }
        }

        [HttpPost("chat")]
        public async Task<IActionResult> PostChat([FromBody] ChatRequest request)
        {
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid request to /chat: {ModelState}", ModelState);
                return BadRequest(new { error = "Request must contain a non-empty 'text' field." });
            }

            var webhookUrl = _configuration.GetValue<string>("N8n:WebhookUrl");
            if (string.IsNullOrWhiteSpace(webhookUrl))
            {
                _logger.LogError("n8n webhook URL is not configured.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { error = "n8n webhook URL is not configured." });
            }

            _logger.LogInformation("Received chat request; forwarding to n8n. Text length={Length}", request.Text?.Length ?? 0);

            try
            {
                var client = _httpClientFactory.CreateClient("n8n");

                var n8nPayload = new { text = request.Text };

                using var resp = await client.PostAsJsonAsync(string.Empty, n8nPayload);

                var bodyString = await resp.Content.ReadAsStringAsync();
                var contentType = resp.Content.Headers.ContentType?.ToString() ?? "application/json";
                var statusCode = (int)resp.StatusCode;

                _logger.LogInformation("n8n responded with status {Status} and content-type {ContentType}", statusCode, contentType);

                if (contentType.Contains("application/json"))
                {
                    try
                    {
                        var jsonObj = System.Text.Json.JsonSerializer.Deserialize<object>(bodyString);
                        return StatusCode(statusCode, jsonObj);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to deserialize JSON from n8n; returning raw body.");
                        return new ContentResult { Content = bodyString, ContentType = contentType, StatusCode = statusCode };
                    }
                }

                return new ContentResult { Content = bodyString, ContentType = contentType, StatusCode = statusCode };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to contact n8n");
                return StatusCode(StatusCodes.Status502BadGateway, new { error = "Failed to contact n8n.", details = ex.Message });
            }
        }
    }
}
