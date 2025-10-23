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
                _logger.LogWarning("Requisição inválida para /chat: {ModelState}", ModelState);
                return BadRequest(new { erro = "A requisição deve conter o campo 'mensagem' não vazio." });
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
                _logger.LogInformation("n8n - tamanho do corpo da resposta: {Length}", bodyString?.Length ?? 0);

                if (!resp.IsSuccessStatusCode)
                {
                    _logger.LogWarning("n8n respondeu com status {Status}", resp.StatusCode);
                    return StatusCode((int)resp.StatusCode, new { erro = "Erro ao processar sua solicitação no n8n." });
                }

                if (string.IsNullOrWhiteSpace(bodyString))
                {
                    _logger.LogWarning("n8n retornou corpo vazio para o webhook {Webhook}", webhookUrl);
                    return Ok(new { resposta = "O workflow do n8n não retornou conteúdo. Verifique se o nó final está configurado para responder." });
                }

                return Ok(new { resposta = bodyString });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Falha ao contatar o n8n");
                return StatusCode(StatusCodes.Status502BadGateway, new { erro = "Falha ao contatar o n8n.", detalhes = ex.Message });
            }
        }
    }
}
