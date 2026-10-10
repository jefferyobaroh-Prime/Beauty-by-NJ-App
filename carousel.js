const slides = document.querySelectorAll(`.slide`)
let index = 0
let timer;

function show(i) {
    index = (i + slides.length) % slides.length
    slides.forEach((s, n) => s.hidden = n !== index)
}

function startTimer() {
    clearInterval(timer)
    timer = setInterval(() => show(index + 1), 10000)
}

document.querySelector (`.next`).onclick = () => { show(index + 1); startTimer()}
document.querySelector (`.prev`).onclick = () => { show(index - 1); startTimer()}

show(0)
startTimer()