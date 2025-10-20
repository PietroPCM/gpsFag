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


/*async function enviarMensagem() {
    const mensagem = messageInput.value.trim();
    if (!mensagem) return;

    
    adicionarMensagemUsuario(mensagem);
    messageInput.value = '';

    
    const typingDiv = mostrarTypingIndicator();

    try {
        await fetch('', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensagem })
        });
    } catch (error) {
        console.error('Erro ao enviar mensagem para o backend:', error);
    } finally {
       
        chatMessages.removeChild(typingDiv);
    }
}*/

//para teste
try {
    const response = await fetch('https://localhost:5290/api/ManController1/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem })
    });

    const resultado = await response.json(); // pega o JSON retornado pelo backend
    if (resultado.resposta) {
        adicionarMensagemBot(resultado.resposta); // mostra no chat
    }
} catch (error) {
    console.error(error);
    adicionarMensagemBot("Erro ao enviar mensagem para o backend.");
} finally {
    chatMessages.removeChild(typingDiv);
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
