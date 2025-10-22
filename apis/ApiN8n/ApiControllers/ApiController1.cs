using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Cors;

namespace ApiN8n.ApiControllers
{
    [ApiController]
    [Route("api/[controller]")]
    [EnableCors("AllowAll")]
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
            public string? Mensagem { get; set; }
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

            _logger.LogInformation("Recebida solicitação de chat; encaminhando para n8n. Tamanho da mensagem={Length}", request.Mensagem?.Length ?? 0);

            try
            {
                var client = _httpClientFactory.CreateClient("n8n");

                var n8nPayload = new { text = request.Mensagem };

                using var resp = await client.PostAsJsonAsync(webhookUrl, n8nPayload);

                var bodyString = await resp.Content.ReadAsStringAsync();
                _logger.LogInformation("n8n response body: {Body}", bodyString);

                if (!resp.IsSuccessStatusCode)
                {
                    _logger.LogWarning("n8n responded with status {Status}", resp.StatusCode);
                    return StatusCode((int)resp.StatusCode, new { mensagem = "Erro ao processar sua solicitação." });
                }

                try
                {
                    return Ok(new { resposta = bodyString });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error processing n8n response");
                    return Ok(new { resposta = "Desculpe, houve um erro ao processar a resposta." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to contact n8n");
                return StatusCode(StatusCodes.Status502BadGateway, new { error = "Failed to contact n8n.", details = ex.Message });
            }
        }
    }
}
