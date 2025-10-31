const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatMessages = document.getElementById('chatMessages');
const newChatBtn = document.getElementById('newChatBtn');


function adicionarMensagemUsuario(texto) {
    const div = document.createElement('div');
    div.classList.add('message', 'user-message');
    div.innerHTML = `
        <div class="message-avatar"><i class="fas fa-user"></i></div>
        <div class="message-content">
            <div class="message-text"><p>${texto}</p></div>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


function mostrarTypingIndicator() {
    const div = document.createElement('div');
    div.classList.add('message', 'ai-message', 'typing-indicator');
    div.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}


function adicionarMensagemBot(texto) {
    const div = document.createElement('div');
    div.classList.add('message', 'ai-message');
    div.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="message-text"><p>${texto}</p></div>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function enviarMensagem() {
    const mensagem = messageInput.value.trim();
    if (!mensagem) return;

    adicionarMensagemUsuario(mensagem);
    messageInput.value = '';

    const typingDiv = mostrarTypingIndicator();

    try {
        const response = await fetch('http://localhost:5180/webhook/feecdcd0-f2e5-47cb-a12f-37a5283268f8', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    body: JSON.stringify({ chatinput: mensagem })  // aqui é o campo que a API espera
});


        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status}`);
        }

        const texto = await response.text();
        let resultado;
        try {
            resultado = JSON.parse(texto);
            console.log('Resposta do servidor:', resultado);
            if (resultado && typeof resultado.resposta === 'string') {
                const respTexto = resultado.resposta.trim();
                adicionarMensagemBot(respTexto);
            } else if (typeof resultado === 'object') {
                // Tenta mostrar o primeiro campo string do objeto
                const valor = resultado.resposta || resultado.message || resultado.text || JSON.stringify(resultado);
                adicionarMensagemBot(valor);
            } else if (typeof resultado === 'string') {
                adicionarMensagemBot(resultado);
            } else {
                adicionarMensagemBot("Recebido, mas formato inesperado.");
            }
        } catch (parseError) {
            console.log('Texto recebido (não-JSON):', texto);
            if (typeof texto === 'string' && texto.trim().length === 0) {
                adicionarMensagemBot("O workflow do n8n não retornou conteúdo. Verifique o nó final do fluxo.");
            } else {
                adicionarMensagemBot(texto);
            }
        }
    } catch (erro) {
        console.error('Erro:', erro);
        adicionarMensagemBot("Não foi possível processar sua mensagem. Por favor, tente novamente.");
    } finally {
        chatMessages.removeChild(typingDiv);
    }
}




sendButton.addEventListener('click', enviarMensagem);

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarMensagem();
    }
});

newChatBtn.addEventListener('click', () => {
    chatMessages.innerHTML = '';
});
