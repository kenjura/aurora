
function zoomImage(evt) {
    console.log(evt);
}



window.addEventListener('load', () => {
    const images = document.querySelectorAll('.wiki-image');
    images.forEach(image => image.addEventListener('click', evt => {
        const img = evt.target;

        // add background
        const background = document.createElement('div');
        background.className = 'wiki-image-clone-background';
        img.parentElement.appendChild(background);

        // add clone
        const newImage = img.cloneNode();
        newImage.classList.add('wiki-image-clone');
        const { x, y } = img.getBoundingClientRect();
        // newImage.style.top = `${y}px`;
        // newImage.style.left = `${x}px`;
        img.parentElement.appendChild(newImage);

        // click to remove
        const removeIt = evt => {
            background.parentElement.removeChild(background);
            newImage.parentElement.removeChild(newImage);   
        };
        newImage.addEventListener('click', removeIt);
        background.addEventListener('click', removeIt);

        setTimeout(() => newImage.classList.add('wiki-image-clone-expando'), 0);
    }));
})