
// Estimateur de prix pour couvreur - Module indépendant
const PriceEstimator = (function() {
    // Webhook WebPrime : le lead part dans l'app et par email au client.
    const WEBHOOK_URL = 'https://webprime.app/webhook/contact/39ddecd3a33cd463499b254e8b2d124a6af45a5d7746503daf03ed250f978440';

    // Même envoi que le formulaire de contact du site (forms.js) : name, email, tel, service, message.
    // Le message reprend les réponses aux questions.
    function sendToWebhook(contact, answers) {
        const body = new FormData();
        body.append('name', contact.nom);
        body.append('email', contact.email);
        body.append('tel', contact.telephone);
        body.append('service', 'Demande de devis - ' + answers['Travaux']);
        const details = Object.keys(answers).map(k => k + ' : ' + answers[k]).join('\n');
        body.append('message', 'Telephone : ' + contact.telephone + '\nPage : ' + location.href + '\n\n' + details);
        return fetch(WEBHOOK_URL, { method: 'POST', body: body, keepalive: true }).catch(() => {});
    }

    // Mêmes règles que le formulaire de contact du site
    const CONTACT_CHECKS = {
        nom: [v => v.length >= 2, 'Indiquez votre nom'],
        email: [v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), 'Adresse email invalide'],
        telephone: [v => /^(\+33|0)[1-9](\d{2}){4}$/.test(v.replace(/[\s.-]/g, '')), 'Numéro de téléphone invalide']
    };

    let currentStep = 1;
    let estimatorData = {
        workType: '',
        housingType: '',
        surface: '',
        location: '',
        access: '',
        materials: '',
        delay: ''
    };

    // Générer dynamiquement les villes depuis la configuration
    const interventionCities = window.BRAND_INTERVENTION_CITIES || [];
    const dept = window.BRAND_DEPARTMENT || 'France';
    const deptDet = window.BRAND_DEPARTMENT_DETERMINER || 'de';
    
    // Convertir le déterminant pour "Autre commune" (de/du/de la/de l'/des)
    const deptDetOf = deptDet === 'en' ? 'de' : 
                     deptDet === 'dans le' ? 'du' : 
                     deptDet === 'dans la' ? 'de la' : 
                     deptDet === "dans l'" ? "de l'" : 
                     deptDet === 'dans les' ? 'des' : 
                     deptDet; // Si déjà 'de', 'du', 'de la', 'de l\'', 'des', on garde
    
    // Convertir un nom de service en data-value (minuscules, sans accents, avec tirets)
    const slugify = text => text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    // Mapping des valeurs data-value vers les labels français
    const VALUE_TO_LABEL = {
        'maison': 'Maison individuelle',
        'appartement': 'Appartement / Copropriété',
        'commercial': 'Local commercial',
        'industriel': 'Bâtiment industriel',
        'moins-50': 'Moins de 50 m²',
        '50-100': '50 à 100 m²',
        '100-200': '100 à 200 m²',
        'plus-200': 'Plus de 200 m²',
        'facile': 'Accès facile',
        'moyen': 'Accès moyen',
        'difficile': 'Accès difficile',
        'tres-difficile': 'Très difficile (hauteur)',
        'economique': 'Économique',
        'standard': 'Standard',
        'premium': 'Premium',
        'haut-gamme': 'Haut de gamme',
        'urgence': 'Urgence (fuite)',
        'sous-2-semaines': 'Sous 2 semaines',
        'dans-le-mois': 'Dans le mois',
        'pas-presse': 'Pas pressé'
    };
    
    // Ajouter dynamiquement les services (le lead affiche le nom du service tel qu'il est sur le site)
    (window.BRAND_SERVICES || []).forEach(service => {
        VALUE_TO_LABEL[slugify(service)] = service;
    });

    // Ajouter dynamiquement les villes
    interventionCities.forEach((city, index) => {
        const slug = 'city-' + index;
        VALUE_TO_LABEL[slug] = city;
    });
    VALUE_TO_LABEL['autre'] = `Autre commune ${deptDetOf}${deptDetOf.endsWith("'")?'':' '}${dept}`;

    function initEstimator() {
        const dept = window.BRAND_DEPARTMENT || 'Vendée';
        const deptNum = window.BRAND_DEPARTMENT_NUMBER || '85';
        const deptDet = window.BRAND_DEPARTMENT_DETERMINER || 'en';
        
        const estimatorHTML = `
            <div id="price-estimator" class="estimator-widget">
                <div class="estimator-card">
                    <div class="estimator-header">
                        <h3>Votre devis couvreur gratuit ${deptDet}${deptDet.endsWith("'")?'':' '}${dept}</h3>
                        <p class="estimator-subtitle">Décrivez votre projet en quelques clics, un couvreur ${deptDetOf}${deptDetOf.endsWith("'")?'':' '}${dept} (${deptNum}) vous recontacte sous 24h</p>
                        <div class="estimator-badge">
                            <span>✅</span> Devis gratuit • Sans engagement • Réponse sous 24h
                        </div>
                    </div>
                    
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>

                    <div class="estimator-content" id="estimator-content">
                        ${getStepHTML(1)}
                    </div>
                </div>
            </div>
        `;

        return estimatorHTML;
    }

    function getStepHTML(step) {
        const dept = window.BRAND_DEPARTMENT || 'France';
        const deptNum = window.BRAND_DEPARTMENT_NUMBER || '';
        const deptDet = window.BRAND_DEPARTMENT_DETERMINER || 'de';
        const deptDetOf = deptDet === 'en' ? 'de' : 
                         deptDet === 'dans le' ? 'du' : 
                         deptDet === 'dans la' ? 'de la' : 
                         deptDet === "dans l'" ? "de l'" : 
                         deptDet === 'dans les' ? 'des' : 
                         deptDet;
        const interventionCities = window.BRAND_INTERVENTION_CITIES || [];
        
        // Génération dynamique des services depuis la configuration
        let servicesHTML = '';
        if (window.BRAND_SERVICES && window.BRAND_SERVICE_EMOJIS) {
            for (let i = 0; i < window.BRAND_SERVICES.length; i++) {
                const service = window.BRAND_SERVICES[i];
                const emoji = window.BRAND_SERVICE_EMOJIS[i];
                const dataValue = slugify(service);

                servicesHTML += `
                    <button class="estimator-option" data-value="${dataValue}">
                        <span class="option-icon">${emoji}</span>
                        <span>${service}</span>
                    </button>`;
            }
        }
        
        // Génération dynamique des villes
        let citiesHTML = '';
        interventionCities.forEach((city, index) => {
            const icon = index === 0 ? '🏛️' : '🏘️';
            citiesHTML += `
                <button class="estimator-option" data-value="city-${index}">
                    <span class="option-icon">${icon}</span>
                    <span>${city}</span>
                </button>`;
        });
        citiesHTML += `
            <button class="estimator-option" data-value="autre">
                <span class="option-icon">📍</span>
                <span>Autre commune ${deptDetOf}${deptDetOf.endsWith("'")?'':' '}${dept}</span>
            </button>`;

        const steps = {
            1: `
                <h4>Quel type de travaux souhaitez-vous ?</h4>
                <div class="estimator-options">
                    ${servicesHTML}
                </div>
            `,
            2: `
                <h4>Quel type de logement ?</h4>
                <div class="estimator-options">
                    <button class="estimator-option" data-value="maison">
                        <span class="option-icon">🏠</span>
                        <span>Maison individuelle</span>
                    </button>
                    <button class="estimator-option" data-value="appartement">
                        <span class="option-icon">🏢</span>
                        <span>Appartement/Copropriété</span>
                    </button>
                    <button class="estimator-option" data-value="commercial">
                        <span class="option-icon">🏪</span>
                        <span>Local commercial</span>
                    </button>
                    <button class="estimator-option" data-value="industriel">
                        <span class="option-icon">🏭</span>
                        <span>Bâtiment industriel</span>
                    </button>
                </div>
                <button class="btn-back">← Retour</button>
            `,
            3: `
                <h4>Surface de toiture à traiter ?</h4>
                <div class="estimator-options">
                    <button class="estimator-option" data-value="moins-50">
                        <span class="option-icon">📏</span>
                        <span>Moins de 50 m²</span>
                    </button>
                    <button class="estimator-option" data-value="50-100">
                        <span class="option-icon">📐</span>
                        <span>50 à 100 m²</span>
                    </button>
                    <button class="estimator-option" data-value="100-200">
                        <span class="option-icon">📊</span>
                        <span>100 à 200 m²</span>
                    </button>
                    <button class="estimator-option" data-value="plus-200">
                        <span class="option-icon">📈</span>
                        <span>Plus de 200 m²</span>
                    </button>
                </div>
                <button class="btn-back">← Retour</button>
            `,
            4: `
                <h4>Localisation en ${dept} (${deptNum}) ?</h4>
                <div class="estimator-options">
                    ${citiesHTML}
                </div>
                <button class="btn-back">← Retour</button>
            `,
            5: `
                <h4>Complexité d'accès ?</h4>
                <div class="estimator-options">
                    <button class="estimator-option" data-value="facile">
                        <span class="option-icon">✅</span>
                        <span>Accès facile</span>
                    </button>
                    <button class="estimator-option" data-value="moyen">
                        <span class="option-icon">⚠️</span>
                        <span>Accès moyen</span>
                    </button>
                    <button class="estimator-option" data-value="difficile">
                        <span class="option-icon">🚧</span>
                        <span>Accès difficile</span>
                    </button>
                    <button class="estimator-option" data-value="tres-difficile">
                        <span class="option-icon">⛰️</span>
                        <span>Très difficile (hauteur)</span>
                    </button>
                </div>
                <button class="btn-back">← Retour</button>
            `,
            6: `
                <h4>Gamme de matériaux souhaitée ?</h4>
                <div class="estimator-options">
                    <button class="estimator-option" data-value="economique">
                        <span class="option-icon">💰</span>
                        <span>Économique</span>
                    </button>
                    <button class="estimator-option" data-value="standard">
                        <span class="option-icon">⭐</span>
                        <span>Standard</span>
                    </button>
                    <button class="estimator-option" data-value="premium">
                        <span class="option-icon">✨</span>
                        <span>Premium</span>
                    </button>
                    <button class="estimator-option" data-value="haut-gamme">
                        <span class="option-icon">💎</span>
                        <span>Haut de gamme</span>
                    </button>
                </div>
                <button class="btn-back">← Retour</button>
            `,
            7: `
                <h4>Délai d'intervention souhaité ?</h4>
                <div class="estimator-options">
                    <button class="estimator-option" data-value="urgence">
                        <span class="option-icon">🚨</span>
                        <span>Urgence (fuite)</span>
                    </button>
                    <button class="estimator-option" data-value="sous-2-semaines">
                        <span class="option-icon">⏱️</span>
                        <span>Sous 2 semaines</span>
                    </button>
                    <button class="estimator-option" data-value="dans-le-mois">
                        <span class="option-icon">📅</span>
                        <span>Dans le mois</span>
                    </button>
                    <button class="estimator-option" data-value="pas-presse">
                        <span class="option-icon">🗓️</span>
                        <span>Pas pressé</span>
                    </button>
                </div>
                <button class="btn-back">← Retour</button>
            `,
            8: `
                <div class="estimator-form-step">
                    <h4>Recevez votre devis personnalisé</h4>
                    <p class="form-subtitle">Réponse d'un professionnel garantie sous 24h</p>
                    
                    <form id="estimator-contact-form" class="estimator-contact-form">
                        <input type="text" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true">
                        <div class="form-group">
                            <input type="text" id="est-nom" name="nom" required autocomplete="name" placeholder="Votre nom">
                        </div>

                        <div class="form-group">
                            <input type="email" id="est-email" name="email" required autocomplete="email" placeholder="Votre email">
                        </div>

                        <div class="form-group">
                            <input type="tel" id="est-tel" name="telephone" required autocomplete="tel" placeholder="Votre téléphone">
                        </div>
                        
                        <button type="submit" class="btn-submit-estimator">📧 Recevoir mon devis</button>
                    </form>
                    
                    <div class="estimator-success" id="estimator-success" style="display: none;">
                        <div class="success-icon">✅</div>
                        <h4>Demande envoyée !</h4>
                        <p>Nous vous recontactons rapidement.</p>
                    </div>
                    
                    <button class="btn-back">← Retour</button>
                </div>
            `
        };

        return steps[step] || '';
    }

    function attachFormSubmitListener() {
        const form = document.getElementById('estimator-contact-form');
        const successMsg = document.getElementById('estimator-success');
        
        if (!form) return;

        const field = name => form.querySelector(`[name="${name}"]`);
        Object.keys(CONTACT_CHECKS).forEach(name => {
            field(name).addEventListener('input', () => field(name).setCustomValidity(''));
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (field('_honey').value) return;

            // Vérifie nom, email et téléphone comme le formulaire de contact
            Object.keys(CONTACT_CHECKS).forEach(name => {
                const [isValid, message] = CONTACT_CHECKS[name];
                field(name).setCustomValidity(isValid(field(name).value.trim()) ? '' : message);
            });
            if (!form.reportValidity()) return;

            const label = key => VALUE_TO_LABEL[estimatorData[key]] || estimatorData[key] || 'Non spécifié';
            const contact = {
                nom: field('nom').value.trim(),
                email: field('email').value.trim(),
                telephone: field('telephone').value.trim()
            };
            const answers = {
                'Travaux': label('workType'),
                'Logement': label('housingType'),
                'Surface': label('surface'),
                'Localisation': label('location'),
                'Accès': label('access'),
                'Matériaux': label('materials'),
                'Délai': label('delay')
            };

            const submitBtn = form.querySelector('.btn-submit-estimator');
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Envoi en cours...';

            // Comme le formulaire de contact : on confirme au plus tard après 4 secondes
            await Promise.race([sendToWebhook(contact, answers), new Promise(r => setTimeout(r, 4000))]);

            form.style.display = 'none';
            successMsg.style.display = 'block';

            // Réinitialiser après 5 secondes
            setTimeout(() => {
                reset();
            }, 5000);
        });
    }

    function updateProgress(percentage) {
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }
    }

    function nextStep(value, field) {
        estimatorData[field] = value;
        currentStep++;

        if (currentStep <= 8) {
            const stepHTML = getStepHTML(currentStep);
            document.getElementById('estimator-content').innerHTML = stepHTML;
            updateProgress((currentStep - 1) * 12.5);
            attachEventListeners();
            
            // Si c'est l'étape 8 (formulaire), attacher le gestionnaire de soumission
            if (currentStep === 8) {
                attachFormSubmitListener();
            }
        }
    }

    function goBack() {
        if (currentStep > 1) {
            currentStep--;
            document.getElementById('estimator-content').innerHTML = getStepHTML(currentStep);
            updateProgress((currentStep - 1) * 14.28);
            attachEventListeners();
        }
    }

    function reset() {
        currentStep = 1;
        estimatorData = {
            workType: '',
            housingType: '',
            surface: '',
            location: '',
            access: '',
            materials: '',
            delay: ''
        };
        document.getElementById('estimator-content').innerHTML = getStepHTML(1);
        updateProgress(0);
        attachEventListeners();
    }

    function attachEventListeners() {
        const options = document.querySelectorAll('.estimator-option');
        const backBtn = document.querySelector('.btn-back');
        const fields = ['workType', 'housingType', 'surface', 'location', 'access', 'materials', 'delay'];
        const field = fields[currentStep - 1];
        
        options.forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                const value = this.getAttribute('data-value');
                nextStep(value, field);
            });
        });

        if (backBtn) {
            backBtn.addEventListener('click', function(e) {
                e.preventDefault();
                goBack();
            });
        }
    }

    return {
        init: function() {
            const estimatorHTML = initEstimator();
            const heroContent = document.querySelector('.hero-content');
            if (heroContent) {
                heroContent.insertAdjacentHTML('afterend', estimatorHTML);
                
                // Récupérer le bouton toggle depuis la bottom-nav
                const toggleButton = document.getElementById('estimator-toggle');
                
                // Ajouter le bouton de fermeture dans l'estimateur
                const estimatorWidget = document.getElementById('price-estimator');
                const closeButton = document.createElement('button');
                closeButton.className = 'estimator-close';
                closeButton.innerHTML = '✕';
                closeButton.setAttribute('aria-label', 'Fermer l\'estimateur');
                estimatorWidget.querySelector('.estimator-card').prepend(closeButton);
                
                // Gérer l'ouverture/fermeture
                toggleButton.addEventListener('click', function() {
                    estimatorWidget.classList.add('open');
                });
                
                closeButton.addEventListener('click', function() {
                    estimatorWidget.classList.remove('open');
                });
                
                setTimeout(attachEventListeners, 100);
            }
        },
        goBack: goBack,
        reset: reset
    };
})();

// Auto-initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', function() {
    PriceEstimator.init();
});
