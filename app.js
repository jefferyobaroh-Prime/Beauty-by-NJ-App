const catToggle = document.querySelector('.categoryToggle')
const catMenu = document.querySelector('.categoryMenu')

catToggle.onclick = () => {
    const open = catMenu.classList.toggle('open')
    catToggle.setAttribute('aria-expanded', open)
}

//close when clicking anywhere else
document.addEventListener('click', (e) => {
    if (!e.target.closest('.categories')) {
        catMenu.classList.remove('open')
        catToggle.setAttribute('aria-expanded', false)
    }
})

document.querySelectorAll('button[data-category]').forEach(btn => {
  btn.addEventListener('click', () => {
    location.href = 'shop.html?category=' + encodeURIComponent(btn.dataset.category);
  });
});