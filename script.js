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
        const response = await fetch('http://localhost:5180/api/ApiController1/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ mensagem: mensagem })
        });

        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status}`);
        }

        const texto = await response.text();
        let resultado;
        
        try {
            resultado = JSON.parse(texto);
            if (resultado && resultado.resposta) {
                adicionarMensagemBot(resultado.resposta);
            } else if (typeof resultado === 'string') {
                adicionarMensagemBot(resultado);
            } else {
                console.log('Resposta do servidor:', resultado);
                adicionarMensagemBot("Recebido, mas formato inesperado.");
            }
        } catch (parseError) {
            console.log('Texto recebido:', texto);
            adicionarMensagemBot(texto);
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
