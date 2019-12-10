import feedbackTemlpate from './template/feedback.hbs';
require('./styles/main.css');

ymaps.ready(initMap);

let myMap,
    currentFeedback = {};

// Инициализируем карту
function initMap() {
    myMap = new ymaps.Map('map', {
        center: [55.76, 37.64],
        zoom: 14,
        behaviors: ['drag'],
        controls: ['zoomControl']
    });

    let feedback = document.getElementById('feedback');
    let address = document.getElementById('address');

    // Показываем форму
    let showForm = position => {
        let x = position[0];
        let y = position[1];

        if (x + feedback.offsetWidth > document.documentElement.clientWidth) {
            x = document.documentElement.clientWidth - feedback.offsetWidth;
        }
        if (x < 0) {
            x = 0;
        }
        if (y + feedback.offsetHeight > document.documentElement.clientHeight) {
            y = document.documentElement.clientHeight - feedback.offsetHeight;
        }
        if (y < 0) {
            y = 0;
        }

        feedback.style.display = 'block';

        feedback.style.left = x + 'px';
        feedback.style.top = y + 'px';

        address.textContent = currentFeedback.address;
        feedback.style.zIndex = 10;
    };

    myMap.events.add('click', e => {
        let coords = e.get('coords');
        let position = e.get('position');

        ymaps
            .geocode(coords)
            .then(res => {
                currentFeedback.coords = coords;
                currentFeedback.address = res.geoObjects
                    .get(0)
                    .getAddressLine(); // Чем ниже индекс у get(i), тем точнее координаты
                showForm(position);
            })
            .catch(() => console.log('Видимо что-то случилось'));
    });

    let closeFeedbackBtn = document.querySelector('.symbol__times');
    let closeForm = () => {
        feedback.style.display = 'none';
    };

    closeFeedbackBtn.addEventListener('click', closeForm);
}
