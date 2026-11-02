(function () {
// Menu mobile
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuClose = document.getElementById('mobile-menu-close');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');
    const bottomNav = document.querySelector('.bottom-nav');

    function openMenu() {
        mobileMenu.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (bottomNav) bottomNav.style.display = 'none';
    }

    function closeMenu() {
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
        if (bottomNav) bottomNav.style.display = 'flex';
    }

    menuToggle.addEventListener('click', openMenu);
    menuClose.addEventListener('click', closeMenu);

    // Fermer le menu au clic sur un lien
    mobileLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Fermer le menu au clic sur le bouton CTA
    const mobileCta = document.querySelector('.mobile-cta a');
    if (mobileCta) {
        mobileCta.addEventListener('click', closeMenu);
    }

    // Fermer au clic en dehors
    mobileMenu.addEventListener('click', function(e) {
        if (e.target === mobileMenu) {
            closeMenu();
        }
    });
});

// Smooth scroll avec offset pour les liens d'ancrage
document.addEventListener('DOMContentLoaded', function() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || !href) return;

            const target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();

            // Offset pour mobile (hauteur header mobile + marge)
            const isMobile = window.innerWidth <= 768;
            const offset = isMobile ? 80 : 100;

            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });

            // Fermer le menu mobile si ouvert
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && mobileMenu.classList.contains('active')) {
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
                const bottomNav = document.querySelector('.bottom-nav');
                if (bottomNav) bottomNav.style.display = 'flex';
            }
        });
    });
});
})();


(function () {
function initInterventionMap() {
    const CITIES = [
        { name: "Lézignan-Corbières", lat: 43.2003, lon: 2.7575, radius: 20000 },
        { name: "Carcassonne", lat: 43.2130, lon: 2.3491, radius: 20000 },
        { name: "Narbonne", lat: 43.1837, lon: 3.0041, radius: 20000 },
        { name: "Castelnaudary", lat: 43.3183, lon: 1.9542, radius: 18000 },
        { name: "Limoux", lat: 43.0553, lon: 2.2186, radius: 18000 },
        { name: "Port-la-Nouvelle", lat: 43.0197, lon: 3.0436, radius: 12000 },
        { name: "Quillan", lat: 42.8752, lon: 2.1820, radius: 12000 },
        { name: "Sigean", lat: 43.0283, lon: 2.9781, radius: 12000 },
        { name: "Trèbes", lat: 43.2108, lon: 2.4417, radius: 12000 },
        { name: "Gruissan", lat: 43.1075, lon: 3.0861, radius: 12000 }
    ];

    const map = L.map('intervention-map', {
        center: [43.13, 2.45],
        zoom: 9,
        zoomControl: true,
        scrollWheelZoom: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
    }).addTo(map);

    const cityData = {};

    function getCitiesInRadius(centerCity) {
        const nearby = [];
        CITIES.forEach(otherCity => {
            if (otherCity.name === centerCity.name) return;
            const R = 6371000;
            const lat1 = centerCity.lat * Math.PI / 180;
            const lat2 = otherCity.lat * Math.PI / 180;
            const deltaLat = (otherCity.lat - centerCity.lat) * Math.PI / 180;
            const deltaLon = (otherCity.lon - centerCity.lon) * Math.PI / 180;
            const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                     Math.cos(lat1) * Math.cos(lat2) *
                     Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c;
            if (distance <= centerCity.radius) {
                nearby.push(otherCity.name);
            }
        });
        return nearby;
    }

    CITIES.forEach(city => {
        const marker = L.marker([city.lat, city.lon], {
            icon: L.divIcon({
                className: 'pulsing-marker',
                html: '<div class="pulse-ring"></div><div class="pulse-dot"></div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(map);

        const circle = L.circle([city.lat, city.lon], {
            color: '#E30613',
            fillColor: '#E30613',
            fillOpacity: 0.2,
            radius: city.radius,
            weight: 3
        });

        cityData[city.name] = { city, marker, circle };

        marker.on('click', () => selectCity(city.name, false));
    });

    const badgesList = document.getElementById('city-badges-list');
    CITIES.forEach(city => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'city-badge';
        button.textContent = city.name;
        button.dataset.city = city.name;
        li.appendChild(button);
        badgesList.appendChild(li);

        button.addEventListener('click', () => selectCity(city.name));
    });

    document.getElementById('close-radius-info').addEventListener('click', () => {
        document.getElementById('radius-info-box').style.display = 'none';
        resetSelection();
    });

    const resetBtn = document.getElementById('reset-map-btn');
    resetBtn.addEventListener('click', resetSelection);

    function selectCity(cityName, shouldZoom = true) {
        const data = cityData[cityName];
        if (!data) return;

        Object.values(cityData).forEach(({ circle }) => {
            if (map.hasLayer(circle)) map.removeLayer(circle);
        });

        data.circle.addTo(map);

        if (shouldZoom) {
            let zoomLevel = 9;
            if (data.city.radius >= 50000) zoomLevel = 7;
            else if (data.city.radius >= 15000) zoomLevel = 9;
            else zoomLevel = 10;

            map.flyTo([data.city.lat, data.city.lon], zoomLevel, { duration: 0.6 });
        }

        resetBtn.style.display = 'inline-block';

        document.querySelectorAll('.city-badge').forEach(badge => {
            badge.classList.toggle('active', badge.dataset.city === cityName);
        });

        const sectorInfo = document.getElementById('sector-info');
        const radiusKm = (data.city.radius / 1000).toFixed(0);
        const nearbyCities = getCitiesInRadius(data.city);

        document.getElementById('sector-city-name').textContent = data.city.name;
        document.getElementById('sector-radius').textContent = '📍 ' + radiusKm + ' km';

        const sectorCitiesList = document.getElementById('sector-cities');
        sectorCitiesList.innerHTML = '';

        if (nearbyCities.length > 0) {
            nearbyCities.forEach(name => {
                const span = document.createElement('span');
                span.className = 'sector-city-tag';
                span.textContent = name;
                sectorCitiesList.appendChild(span);
            });
        } else {
            const span = document.createElement('span');
            span.className = 'sector-city-tag';
            span.textContent = 'Zone principale';
            sectorCitiesList.appendChild(span);
        }

        sectorInfo.style.display = 'block';
    }

    function resetSelection() {
        Object.values(cityData).forEach(({ circle }) => {
            if (map.hasLayer(circle)) map.removeLayer(circle);
        });
        map.flyTo([48.4469, 1.4888], 9, { duration: 0.6 });
        document.querySelectorAll('.city-badge').forEach(badge => {
            badge.classList.remove('active');
        });
        document.getElementById('sector-info').style.display = 'none';
        resetBtn.style.display = 'none';
    }

    const mapWrapper = document.querySelector('.intervention-map-wrapper');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                mapWrapper.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    observer.observe(mapWrapper);
}
document.addEventListener('DOMContentLoaded', function() {
    var el = document.getElementById('intervention-map');
    if (!el) return;
    var loaded = false;
    function load() {
        if (loaded) return; loaded = true;
        var css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);
        var js = document.createElement('script');
        js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        js.onload = initInterventionMap;
        document.head.appendChild(js);
    }
    if (!('IntersectionObserver' in window)) { load(); return; }
    var io = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) { io.disconnect(); load(); }
    }, { rootMargin: '300px' });
    io.observe(el);
});
})();


(function () {
// Données des avis clients (chargées depuis le fichier JSON)
window.REVIEWS = [{"author_name":"Thomas Durand","rating":5,"text":"L’équipe a refait la zinguerie sur ma maison. Le chantier s’est bien passé, sans traîner. Bon contact, pas de vente forcée, juste ce qu’il fallait. Je suis satisfait du résultat final.","time":"2026-04-30","profile_photo_url":""},{"author_name":"Nenavath Chandar","rating":5,"text":"À Barjouville, j’ai fait refaire l’étanchéité d’un toit plat. Intervention bien menée, équipe agréable et pro. Le résultat est propre, et depuis la pluie ne pose plus de problème. Service sérieux, je recommande.","time":"2026-04-30","profile_photo_url":""},{"author_name":"Kahisse Anziz","rating":5,"text":"Cette semaine, j’ai eu affaire à des couvreurs très à l’écoute de mes besoins dans la ville voisine. Ils travaillent rapidement et laissent un chantier propre derrière eux. Du vrai professionnalisme . Ça fait plaisir de voir des pros aussi efficaces à l’œuvre, merci ! Merci beaucoup d'avoir pris le temps de partager votre expérience avec notre","time":"2026-04-30","profile_photo_url":""},{"author_name":"Kiwi SpazzX","rating":5,"text":"Un vrai soulagement ! Réparation de toiture impeccablement exécutée aujourd'hui. Pas une trace de désordre après le travail. Un service vraiment pro et très soigné. Mention spéciale pour la réactivité et l'efficacité. Mon toit vous remercie ! Nous sommes ravis d'apprendre que la réparation de votre toiture s'est déroulée","time":"2026-04-30","profile_photo_url":""},{"author_name":"Julian Fournier","rating":5,"text":"C'est sûr, après avoir essayé quelques couvreurs du coin, j'peux vous dire que Renovation Toiture, ils sont au dessus du lot. Ils ont retapé ma toiture comme des pros, pas un truc de traviole. Du boulot bien fait, très pro, je les remercie. Quel soulagement de les avoir trouvé près de chez moi ! J'ai jamais été aussi satisfait d'un service. Nous sommes particulièrement touchés de lire que vous nous placez \"au-dessus du","time":"2026-04-30","profile_photo_url":""},{"author_name":"Khazzar Mohamed","rating":5,"text":"il y a une semaine Rien à redire, Renovation Toiture c'est le top ! Après un autre essai, toujours au top : conseils nickel, boulot bien fait et pas de retard. Impec' Ma note perso : 5\/5! Je recommande sans hésiter. Travail propre et soigné du début à la fin. Équipe professionnelle et efficace.","time":"2026-04-30","profile_photo_url":""},{"author_name":"Ensar Ajdini","rating":5,"text":"il y a une semaine jai trouvé Renovation Toiture sur internet et jai décidé de leur faire confiance cest vraiment une bonne décision mon toit était en mauvais état mais ces gars ont fait un super travail le toit est maintenant comme neuf et le prik était très Merci beaucoup pour votre avis si chaleureux et détaillé ! Je suis vraiment ravi","time":"2026-04-30","profile_photo_url":""},{"author_name":"LBN","rating":5,"text":"il y a une semaine j'ai choisi cet artisans car il est tres qualifié.","time":"2026-04-30","profile_photo_url":""},{"author_name":"Gabin Roussies","rating":5,"text":"C'est pas ma première danse avec Renovation Toiture. J'peux vous dire, ces gars-là sont carrés. Ma toiture, elle brille comme au premier jour, un vrai bijou. Pas une minute de retard. Si j'avais un autre toit, j'leur filerais direct ! Nous vous remercions sincèrement pour votre fidélité et pour ce témoignage qui","time":"2026-04-30","profile_photo_url":""},{"author_name":"Kélian Roybin","rating":5,"text":"il y a un mois Je suis absolument impressionné par le professionnalisme de Renovation Toiture. J'ai dû refaire le joint de dilatation de ma corniche et le contour de mon Velux, et j'ai contacté plusieurs entreprises, mais hélas, peu d'entre elles semblaient Nous vous remercions sincèrement pour votre témoignage détaillé. Nous sommes Neville Dufresne 13 avis · 1 photo Pose d’un Velux avec volet solaire. L’entreprise s’est occupée de tout, même de la déclaration préalable. Rien à...","time":"2026-04-30","profile_photo_url":""},{"author_name":"Audrey Durand","rating":5,"text":"L’intervention a été rapide pour un problème de fuite sur le toit à Lezignan. Diagnostic précis et pas de travaux inutiles. Le problème a été réglé rapidement.","time":"2026-04-30","profile_photo_url":""},{"author_name":"Marveille","rating":5,"text":"Devis clair, délais tenus, travail soigné. Ils ont refait une partie de la charpente affaiblie. L’intervention s’est très bien passée. Je garde leur contact précieusement. Merci pour votre avis, nous sommes ravis de lire que le devis clair, le respect","time":"2026-04-30","profile_photo_url":""},{"author_name":"Honoré Lamoureux","rating":5,"text":"Devis clair, délais tenus, travail soigné. Ils ont refait une partie de la charpente affaiblie. L’intervention s’est très bien passée. Je garde leur contact précieusement. Nous vous remercions chaleureusement pour votre retour. Nous sommes ravis Philippe Moreau 8 avis · 2 photos C'est la troisième fois que j'fais appel à Renovation Toiture pour la rénovation de ma toiture. Ces gars sont de vrais experts et font toujours du bon travail. J'peux compter sur eux pour être à l'écoute et...","time":"2026-04-30","profile_photo_url":""},{"author_name":"Arnou","rating":5,"text":"Devis clair, délais tenus, travail soigné. Ils ont refait une partie de la charpente affaiblie. L’intervention s’est très bien passée. Je garde leur contact précieusement. Merci pour votre avis, nous sommes ravis de lire que le devis clair, le respect","time":"2026-04-30","profile_photo_url":""},{"author_name":"Tabor Salois","rating":5,"text":"Réfection complète de la toiture de mon pavillon à Lezignan, excellent boulot. Tout a été respecté, du devis aux finitions. On sent le sérieux et l’expérience.","time":"2026-04-30","profile_photo_url":""},{"author_name":"Robert Corbeil","rating":5,"text":"Renovation Toiture a refait l’étanchéité d’un toit plat. Le chantier a été proprement mené, avec des explications à chaque étape. On voit que le travail est bien fait. Aucun souci depuis.","time":"2026-04-30","profile_photo_url":""},{"author_name":"Tsukiro Arslane","rating":5,"text":"Franchement, j'suis bigrement content de l'travail que Renovation Toiture a fait sur ma toiture. Rapides comme l'éclair, ces gars là sont de vrais pros ! C'est comme si ma toiture avait été revampée, elle est comme neuve. Chapeau bas les gars, c'est du bon boulot ! Merci beaucoup pour votre retour enthousiaste ! Nous sommes ravis d'apprendre","time":"2026-04-30","profile_photo_url":""},{"author_name":"Harbin Avare","rating":5,"text":"Professionnels, à l’écoute, respect des horaires. J’ai apprécié leur efficacité sur le chantier. Et en plus, ils sont venus à l’heure, ce qui devient rare. Je recommande. Merci beaucoup pour votre avis positif ! Nous sommes ravis d'apprendre que notre","time":"2026-04-30","profile_photo_url":""},{"author_name":"Platt Boulé","rating":5,"text":"J’avais besoin d’un ravalement de façade sur ma maison à Lezignan. Le résultat est super. L’aspect extérieur est nettement amélioré, sans bavure ni salissures. Travaux bien menés du début à la fin. Merci beaucoup pour votre avis positif ! Nous sommes ravis d'apprendre que le","time":"2026-04-30","profile_photo_url":""},{"author_name":"Yvette Dumoulin","rating":5,"text":"Bonne équipe, sérieuse et agréable. Ils ont refait la zinguerie sur une maison ancienne. Résultat propre et esthétique. Les finitions sont vraiment bien faites. Merci beaucoup pour votre retour positif ! Nous sommes ravis que notre équipe Aimé Vaillancour 6 avis · 3 photos Pose de gouttières en zinc sur un pavillon à Lezignan, très bon travail, ajustement précis. On voit qu’ils maîtrisent bien leur métier, ça inspire confiance. Merci beaucoup pour votre avis positif ! Nous so...","time":"2026-04-30","profile_photo_url":""},{"author_name":"Vernon Doiron","rating":5,"text":"L’intervention s’est faite rapidement après un épisode de vent qui avait endommagé quelques tuiles. L’équipe est intervenue en urgence et a sécurisé la zone avant de finaliser les réparations. Merci beaucoup pour votre retour positif ! Nous sommes ravis d'avoir pu","time":"2026-04-30","profile_photo_url":""},{"author_name":"Avenall Perrault","rating":5,"text":"Très bonne expérience avec Renovation Toiture pour la rénovation complète de ma toiture à Lezignan. Chantier bien organisé, ouvriers polis et discrets, aucun souci de communication. Le chef de chantier est passé plusieurs fois pour suivre l’avancement, ce qui rassure. Merci beaucoup pour votre retour positif ! Nous sommes ravis que l'organisation","time":"2026-04-30","profile_photo_url":""},{"author_name":"Francis Jacques","rating":5,"text":"Isolation de toiture bien réalisée. Ils ont tout expliqué en amont et respecté les délais. Aucun dépassement de budget, pas de surprise. Je recommande sans hésiter. Merci beaucoup pour votre retour positif ! Nous sommes ravis que l'isolation de","time":"2026-04-30","profile_photo_url":""},{"author_name":"Guerin Lacombe","rating":5,"text":"Très satisfait du démoussage effectué sur ma toiture. L’équipe a été ponctuelle, efficace et a laissé les lieux propres. Rien à redire, je referai appel à eux si besoin. Merci beaucoup pour votre retour positif ! Nous sommes ravis que le démoussage","time":"2026-04-30","profile_photo_url":""},{"author_name":"Yolette Franchet","rating":5,"text":"J’ai fait appel à l’entreprise pour une fuite qui s’infiltrait depuis plusieurs semaines. Intervention rapide, diagnostic clair, et réparation faite dans la foulée. Depuis, plus aucun souci. Travail propre et soigné, ça fait plaisir de tomber sur des pros fiables à Lezignan. Merci beaucoup pour votre retour positif ! Nous sommes ravis d'apprendre que","time":"2026-04-30","profile_photo_url":""},{"author_name":"Arno Loiselle","rating":5,"text":"Entreprise sérieuse à Lezignan, j’ai apprécié leur ponctualité et le fait qu’ils tiennent leurs engagements. Bonne communication tout au long du chantier, ce qui est loin d’être toujours le cas ailleurs. Merci beaucoup pour votre avis positif ! Nous sommes ravis que notre ponctualité","time":"2026-04-30","profile_photo_url":""},{"author_name":"Eliot Brian","rating":5,"text":"Remplacement de gouttières effectué dans les délais. Ils ont bien pris le temps de m’expliquer les options. Le rendu final est nickel et aucune trace de chantier après leur départ Merci beaucoup pour votre retour positif ! Nous sommes ravis d'apprendre que le","time":"2026-04-30","profile_photo_url":""},{"author_name":"Pierpont Édouard","rating":5,"text":"Travail efficace pour la pose d’un Velux dans les combles. Tout a été fait avec soin, aucun dégât, finition propre. L’équipe a su s’adapter aux contraintes de la pièce sans chipoter. Merci beaucoup pour votre retour positif ! Nous sommes ravis que la pose de","time":"2026-04-30","profile_photo_url":""},{"author_name":"Hamilton Auger","rating":5,"text":"J’avais une toiture très sale sur ma maison à Lezignan, ils ont proposé un nettoyage complet avec démoussage. Le résultat est vraiment visible, le toit paraît neuf. Mention spéciale à la réactivité entre la demande de devis et l’intervention. Merci beaucoup pour votre avis positif ! Nous sommes ravis de savoir que vous","time":"2026-04-30","profile_photo_url":""},{"author_name":"Meyrius","rating":5,"text":"Renovation Toiture, ils ont assuré grave sur mon toit! Toujours là, même après des plombes! Merci beaucoup pour votre avis enthousiaste ! Nous sommes ravis d'apprendre que","time":"2026-04-30","profile_photo_url":""},{"author_name":"Catherine COMBEMOREL","rating":5,"text":"Après l'orage, mon toit était fichu. Rapide et efficace, Renovation Toiture l'a réparé. Merci. Merci beaucoup pour votre avis positif ! Nous sommes ravis d'avoir pu réparer","time":"2026-04-30","profile_photo_url":""},{"author_name":"Donat Voisine","rating":5,"text":"On a fait appel à l’entreprise pour un remplacement de gouttières à Luisant. L’intervention a été rapide malgré la météo compliquée. L’équipe a tout laissé propre derrière elle, c’est appréciable. Le devis était respecté, pas de mauvaise surprise. Merci beaucoup pour votre retour positif ! Nous sommes ravis que notre","time":"2026-04-30","profile_photo_url":""},{"author_name":"Zdenek Bolduc","rating":5,"text":"Travail sérieux pour le nettoyage de la toiture, ils ont bien pris le temps d’expliquer chaque étape. Ponctuels, discrets, efficaces. Rien à redire, ça change des mauvaises surprises qu’on peut avoir parfois avec des artisans. Merci beaucoup pour votre retour positif ! Nous sommes ravis que notre sérieux","time":"2026-04-30","profile_photo_url":""},{"author_name":"Joackim Freville Matthey","rating":5,"text":"Je m'étais réveillé un matin pour découvrir que ma toiture avait cédé suite à un vent violent lors de la nuit. Les tuiles étaient éparpillées un peu partout, un vrai chaos de briques colorées. Heureusement, Renovation Toiture est venu à la","time":"2026-04-30","profile_photo_url":""}];
window.REVIEWS_AVERAGE = 5.0;
window.REVIEWS_TOTAL = 46;

// Logo Google SVG
const googleLogo = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
  <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
  <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
  <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
</svg>`;

// Utilitaire pour échapper le HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Générer les étoiles
function generateStars(rating) {
  const fullStars = Math.round(rating);
  return 'â˜…'.repeat(fullStars);
}

// Générer les cartes d'avis sur plusieurs lignes
function generateReviewCards() {
  const masonry = document.getElementById('reviews-masonry');

  // 2 rangées sur mobile et desktop
  const isMobile = window.innerWidth <= 768;
  const numRows = 2;

  // Diviser les avis en plusieurs groupes
  const reviewsPerRow = Math.ceil(REVIEWS.length / numRows);

  for (let i = 0; i < numRows; i++) {
    const rowReviews = REVIEWS.slice(i * reviewsPerRow, (i + 1) * reviewsPerRow);

    const row = document.createElement('div');
    row.className = 'reviews-row';

    // Dupliquer les avis pour un défilement infini
    [...rowReviews, ...rowReviews].forEach(review => {
      const card = createReviewCard(review);
      row.appendChild(card);
    });

    masonry.appendChild(row);
  }
}

// Créer une carte d'avis
function createReviewCard(review) {
  const card = document.createElement('article');
  card.className = 'review-card';

  // Créer l'avatar avec les initiales
  const initials = review.author_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  // Générer les étoiles de façon programmatique
  const star = String.fromCharCode(9733);
  const stars = star.repeat(review.rating);

  card.innerHTML = `
    <div class="review-header">
      <div class="review-avatar">${initials}</div>
      <div>
        <div class="review-author">${escapeHtml(review.author_name)}</div>
        <div class="review-stars">${stars}</div>
      </div>
    </div>
    <div class="review-text">&laquo; ${escapeHtml(review.text)} &raquo;</div>
  `;

  return card;
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
  if (REVIEWS.length > 0) {
    generateReviewCards();
  }
});
})();


(function () {
// Galerie photo avec navigation par boutons (infini)
(function() {
    const slider = document.getElementById('gallery-slider');
    const slides = document.querySelectorAll('.gallery-slide');
    const prevBtn = document.querySelector('.gallery-prev');
    const nextBtn = document.querySelector('.gallery-next');

    if (!slider || slides.length === 0) return;

    let currentIndex = 0;
    const slideWidth = 400; // Largeur d'une slide
    const totalSlides = slides.length;

    // Initialiser au début
    slider.scrollLeft = 0;

    function scrollToIndex(index) {
        slider.scrollTo({
            left: index * slideWidth,
            behavior: 'smooth'
        });
    }

    // Navigation suivante
    nextBtn.addEventListener('click', () => {
        currentIndex++;

        // Boucler au début si on dépasse
        if (currentIndex >= totalSlides) {
            currentIndex = 0;
        }

        scrollToIndex(currentIndex);
    });

    // Navigation précédente
    prevBtn.addEventListener('click', () => {
        currentIndex--;

        // Boucler à la fin si on descend en dessous de 0
        if (currentIndex < 0) {
            currentIndex = totalSlides - 1;
        }

        scrollToIndex(currentIndex);
    });
})();

// Lightbox pour afficher les images en grand
(function() {
    const lightbox = document.getElementById('gallery-lightbox');
    const lightboxContent = lightbox.querySelector('.lightbox-media-container');
    const lightboxCounter = lightbox.querySelector('.lightbox-counter');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');

    const galleryImages = document.querySelectorAll('.gallery-image');
    let currentLightboxIndex = 0;
    let allMediaItems = [];

    // Collecter toutes les images uniques (sans les doublons)
    const uniqueMedia = new Map();
    galleryImages.forEach(media => {
        const src = media.src;
        if (!uniqueMedia.has(src)) {
            uniqueMedia.set(src, {
                src: src,
                element: media
            });
        }
    });
    allMediaItems = Array.from(uniqueMedia.values());

    // Ouvrir la lightbox au clic sur une image
    galleryImages.forEach((media, idx) => {
        media.style.cursor = 'pointer';
        media.parentElement.style.cursor = 'pointer';

        const clickHandler = () => {
            const src = media.src;
            // Trouver l'index dans le tableau unique
            currentLightboxIndex = allMediaItems.findIndex(item => item.src === src);
            openLightbox(currentLightboxIndex);
        };

        media.addEventListener('click', clickHandler);
        media.parentElement.addEventListener('click', clickHandler);
    });

    function openLightbox(index) {
        currentLightboxIndex = index;
        updateLightboxContent();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function updateLightboxContent() {
        const item = allMediaItems[currentLightboxIndex];

        lightboxContent.innerHTML = `
            <img src="${item.src}" style="max-width: 100%; max-height: 90vh; width: auto; height: auto;" alt="Image en grand">
        `;

        lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${allMediaItems.length}`;
    }

    function showNext() {
        currentLightboxIndex = (currentLightboxIndex + 1) % allMediaItems.length;
        updateLightboxContent();
    }

    function showPrev() {
        currentLightboxIndex = (currentLightboxIndex - 1 + allMediaItems.length) % allMediaItems.length;
        updateLightboxContent();
    }

    // Événements
    closeBtn.addEventListener('click', closeLightbox);
    nextBtn.addEventListener('click', showNext);
    prevBtn.addEventListener('click', showPrev);

    // Fermer en cliquant sur le fond
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Navigation au clavier
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;

        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') showNext();
        if (e.key === 'ArrowLeft') showPrev();
    });
})();
})();


(function () {
// Navigation services - Drag scroll et flèches sur desktop, single card sur mobile
const servicesGrid = document.querySelector('.services-grid');
const prevBtn = document.querySelector('.services-nav-prev');
const nextBtn = document.querySelector('.services-nav-next');

if (prevBtn && nextBtn && servicesGrid) {
    let currentIndex = 0;
    const cards = servicesGrid.querySelectorAll('.service-card');

    // Créer l'indicateur de pagination pour mobile
    const pageIndicator = document.createElement('div');
    pageIndicator.className = 'service-page-indicator';
    servicesGrid.parentElement.appendChild(pageIndicator);

    function isMobile() {
        return window.innerWidth <= 768;
    }

    // === MOBILE : Navigation carte par carte ===
    function showCard(index) {
        if (!isMobile()) return;

        if (index < 0) index = 0;
        if (index >= cards.length) index = cards.length - 1;

        currentIndex = index;
        cards.forEach(card => card.classList.remove('active'));
        cards[currentIndex].classList.add('active');

        // Mettre à jour l'indicateur de pagination
        pageIndicator.textContent = `${currentIndex + 1}/${cards.length}`;
    }

    // Support tactile pour mobile (swipe)
    let touchStartX = 0;
    let touchEndX = 0;

    servicesGrid.addEventListener('touchstart', (e) => {
        if (!isMobile()) return;
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    servicesGrid.addEventListener('touchend', (e) => {
        if (!isMobile()) return;
        touchEndX = e.changedTouches[0].screenX;
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                showCard(currentIndex + 1);
            } else {
                showCard(currentIndex - 1);
            }
        }
    }, { passive: true });

    // === DESKTOP : Drag scroll + Navigation par flèches ===
    let isDown = false;
    let startX;
    let scrollLeft;

    // Drag scroll sur desktop
    servicesGrid.addEventListener('mousedown', (e) => {
        if (isMobile()) return;
        isDown = true;
        servicesGrid.classList.add('active');
        startX = e.pageX - servicesGrid.offsetLeft;
        scrollLeft = servicesGrid.scrollLeft;
    });

    servicesGrid.addEventListener('mouseleave', () => {
        if (isMobile()) return;
        isDown = false;
        servicesGrid.classList.remove('active');
    });

    servicesGrid.addEventListener('mouseup', () => {
        if (isMobile()) return;
        isDown = false;
        servicesGrid.classList.remove('active');
    });

    servicesGrid.addEventListener('mousemove', (e) => {
        if (!isDown || isMobile()) return;
        e.preventDefault();
        const x = e.pageX - servicesGrid.offsetLeft;
        const walk = (x - startX) * 2;
        servicesGrid.scrollLeft = scrollLeft - walk;
    });

    // Navigation par flèches sur desktop
    prevBtn.addEventListener('click', () => {
        if (isMobile()) {
            showCard(currentIndex - 1);
        } else {
            servicesGrid.scrollBy({ left: -320, behavior: 'smooth' });
        }
    });

    nextBtn.addEventListener('click', () => {
        if (isMobile()) {
            showCard(currentIndex + 1);
        } else {
            servicesGrid.scrollBy({ left: 320, behavior: 'smooth' });
        }
    });

    // Initialiser
    function init() {
        if (isMobile()) {
            showCard(0);
            servicesGrid.classList.add('mobile-mode');
            pageIndicator.style.display = 'block';
        } else {
            cards.forEach(card => card.classList.remove('active'));
            servicesGrid.classList.remove('mobile-mode');
            pageIndicator.style.display = 'none';
        }
    }

    init();

    // Réinitialiser au resize
    window.addEventListener('resize', init);
}

// Cacher l'estimateur quand on arrive sur la section services
const estimatorWidget = document.getElementById('price-estimator');
const servicesSection = document.querySelector('.services-section');

if (estimatorWidget && servicesSection) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Section services visible - cacher l'estimateur
                estimatorWidget.style.display = 'none';
            } else {
                // Section services non visible - afficher l'estimateur
                estimatorWidget.style.display = 'block';
            }
        });
    }, {
        threshold: 0.1 // Se déclenche quand 10% de la section est visible
    });

    observer.observe(servicesSection);
}
})();


(function () {
// Script pour le curseur avant/après
const container = document.querySelector('.before-after-container');
const beforeImage = document.querySelector('.before-image');
const sliderHandle = document.querySelector('.slider-handle');

if (container && beforeImage && sliderHandle) {
    let isDragging = false;

    function updateSlider(x) {
        const rect = container.getBoundingClientRect();
        const offsetX = x - rect.left;
        const percentage = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));

        beforeImage.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
        sliderHandle.style.left = `${percentage}%`;
    }

    function startDragging(e) {
        isDragging = true;
        e.preventDefault();
    }

    function stopDragging() {
        isDragging = false;
    }

    function handleMove(e) {
        if (!isDragging) return;

        const x = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        updateSlider(x);
    }

    // Mouse events
    sliderHandle.addEventListener('mousedown', startDragging);
    container.addEventListener('mousedown', function(e) {
        const x = e.clientX;
        updateSlider(x);
        startDragging(e);
    });
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('mousemove', handleMove);

    // Touch events
    sliderHandle.addEventListener('touchstart', startDragging, { passive: false });
    container.addEventListener('touchstart', function(e) {
        const x = e.touches[0].clientX;
        updateSlider(x);
        startDragging(e);
    }, { passive: false });
    document.addEventListener('touchend', stopDragging);
    document.addEventListener('touchmove', handleMove, { passive: false });
}
})();


(function () {
document.addEventListener('DOMContentLoaded', function() {
    const chatboxToggle = document.getElementById('chatbox-toggle');
    const chatboxMenu = document.getElementById('chatbox-menu');
    const chatboxClose = document.getElementById('chatbox-close');

    function openChatbox() {
        chatboxMenu.classList.add('active');
        chatboxToggle.style.transform = 'scale(0)';
    }

    function closeChatbox() {
        chatboxMenu.classList.remove('active');
        chatboxToggle.style.transform = 'scale(1)';
    }

    chatboxToggle.addEventListener('click', openChatbox);
    chatboxClose.addEventListener('click', closeChatbox);

    chatboxMenu.addEventListener('click', function(e) {
        if (e.target === chatboxMenu) {
            closeChatbox();
        }
    });

    // Google Reviews Widget
    const reviewsBadge = document.getElementById('reviews-badge');
    const reviewsPanel = document.getElementById('reviews-panel');
    const reviewsClose = document.getElementById('reviews-close');
    const reviewsList = document.getElementById('reviews-list');

    // Utiliser les avis depuis le fichier JSON
    const star = String.fromCharCode(9733);
    REVIEWS.forEach(review => {
        const initials = review.author_name.split(' ').map(n => n[0]).join('');
        const stars = star.repeat(review.rating);
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        reviewItem.innerHTML = `
            <div class="review-header">
                <div class="review-avatar">${initials}</div>
                <div>
                    <div class="review-author">${review.author_name}</div>
                    <div class="review-stars">${stars}</div>
                </div>
            </div>
            <div class="review-text">${review.text}</div>
        `;
        reviewsList.appendChild(reviewItem);
    });

    reviewsBadge.addEventListener('click', function() {
        reviewsPanel.classList.toggle('active');
    });

    reviewsClose.addEventListener('click', function() {
        reviewsPanel.classList.remove('active');
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.google-reviews-widget') && !e.target.closest('#bottom-nav-avis-btn')) {
            reviewsPanel.classList.remove('active');
        }
    });

    // Bouton Avis dans la bottom nav
    const bottomNavAvisBtn = document.getElementById('bottom-nav-avis-btn');
    if (bottomNavAvisBtn) {
        bottomNavAvisBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            reviewsPanel.classList.add('active');
        });
    }
});
})();


(function () {
// Remplacer dynamiquement toutes les couleurs hardcodées
(function() {
    const PRIMARY_COLOR = window.BRAND_PRIMARY_COLOR || '#f9e406';
    const SECONDARY_COLOR = window.BRAND_SECONDARY_COLOR || '#FFFFFF';

    // Liste de toutes les couleurs à remplacer
    const colorsToReplace = [
        '#DC143C', '#dc143c',
        '#E30613', '#e30613',
        '#B22222', '#b22222',
        '#FF6B6B', '#ff6b6b',
        '#FF4444', '#ff4444',
        '#f9e406', '#F9E406',
        '#7391ca', '#7391ca'
    ];

    // Remplacer dans tous les éléments avec attribut style
    document.querySelectorAll('[style]').forEach(el => {
        let style = el.getAttribute('style');
        colorsToReplace.forEach(color => {
            const regex = new RegExp(color, 'gi');
            style = style.replace(regex, PRIMARY_COLOR);
        });
        el.setAttribute('style', style);
    });

    // Remplacer dans tous les stop des gradients SVG
    document.querySelectorAll('stop[style]').forEach(stop => {
        let style = stop.getAttribute('style');
        colorsToReplace.forEach(color => {
            const regex = new RegExp(color, 'gi');
            style = style.replace(regex, PRIMARY_COLOR);
        });
        stop.setAttribute('style', style);
    });

})();
})();
