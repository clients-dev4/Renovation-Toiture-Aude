
// Estimateur de prix pour couvreur - Module indépendant
const PriceEstimator = (function() {
    // Webhook WebPrime : le lead part dans l'app et par email au client.
    const WEBHOOK_URL = 'https://webprime.app/webhook/contact/39ddecd3a33cd463499b254e8b2d124a6af45a5d7746503daf03ed250f978440';

    function sendToWebhook(data) {
        const body = new FormData();
        body.append('name', data.nom || '');
        body.append('email', data.email || '');
        body.append('tel', data.telephone || '');
        body.append('service', 'Estimateur - ' + (data.travaux || 'toiture'));
        const details = Object.keys(data)
            .filter(k => !['type', 'nom', 'email', 'telephone'].includes(k))
            .map(k => k + ' : ' + data[k])
            .join('\n');
        body.append('message', 'Telephone : ' + (data.telephone || '') + '\nPage : ' + location.href + '\n\n' + details);
        return fetch(WEBHOOK_URL, { method: 'POST', body: body, keepalive: true }).catch(() => {});
    }

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

    // --- Prix base €/m² par type de travaux ---
    const BASE_BY_WORK = {
        "Rénovation Toiture":                        80,
        "Réparation Toiture":                        75,
        "Urgence réparation fuite":                  90,
        "Remplacement complet toiture à neuf":       120,
        "Ravalement de façade":                      45,
        "Nettoyage toiture":                         30,
        "Pose de gouttières":                        50,
        "Zinguerie":                                 85,
        "Pose et remplacement de fenetre de toit":   180,
        "Réparation Faitière":                       70
    };

    // --- m² de référence par palier ---
    const SURFACE_BUCKET = {
        "Moins de 50 m²":   40,
        "50 à 100 m²":      75,
        "100 à 200 m²":     150,
        "Plus de 200 m²":   240
    };

    // --- Coefficients de contexte ---
    const HOUSING_FACTOR = {
        "Maison individuelle":         1.00,
        "Appartement / Copropriété":   1.08,
        "Local commercial":            1.12,
        "Bâtiment industriel":         1.18
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
    
    const LOCATION_FACTORS = {};
    interventionCities.forEach(city => {
        LOCATION_FACTORS[city] = 1.00;
    });
    LOCATION_FACTORS[`Autre commune ${deptDetOf}${deptDetOf.endsWith("'")?'':' '}${dept}`] = 1.00;

    const ACCESS_FACTOR = {
        "Accès facile":                 1.00,
        "Accès moyen":                  1.10,
        "Accès malaisé":              1.22,
        "Très malaisé (grande hauteur)":     1.35
    };

    const MATERIAL_FACTOR = {
        "Économique":    0.92,
        "Standard":      1.00,
        "Premium":       1.15,
        "Haut de gamme": 1.30
    };

    const DEADLINE_FACTOR = {
        "C'est urgent (fuite en cours)":  1.25,
        "D’ici deux semaines":  1.10,
        "Dans le mois":     1.00,
        "Pas pressé":       0.95
    };

    // --- Indication horaire moyenne par type ---
    const HOURLY_HINT = {
        "Recherche de fuites toiture":          "65–95 € HT/h",
        "Travaux de couverture & zinguerie":        "55–85 € HT/h",
        "Traitement de toiture":                "40–60 € HT/h",
        "Traitement et nettoyage de fa\u00e7ade":                   "30–50 € HT/h",
        "Nettoyage de toiture":                   "20–35 € HT/h",
        "R\u00e9paration de toiture bac acier":        "50–75 € HT/h",
        "Goutti\u00e8res : d\u00e9bouchage et remplacement":                "45–70 € HT/h",
        "R\u00e9paration de chemin\u00e9e et fa\u00eetage":        "55–85 € HT/h",
        "Nettoyage et traitement de bardage":                   "35–55 € HT/h",
        "Ramonage de chemin\u00e9e":                    "Forfait 80–150 € HT"
    };

    // Mapping des valeurs data-value vers les labels français
    const VALUE_TO_LABEL = {
        'renovation-toiture': 'Rénovation Toiture',
        'reparation-toiture': 'Réparation Toiture',
        'urgence-reparation-fuite': 'Urgence réparation fuite',
        'remplacement-toiture': 'Remplacement complet toiture à neuf',
        'ravalement-facade': 'Ravalement de façade',
        'nettoyage-toiture': 'Nettoyage toiture',
        'pose-gouttieres': 'Pose de gouttières',
        'zinguerie': 'Zinguerie',
        'fenetre-toit': 'Pose et remplacement de fenetre de toit',
        'reparation-faitiere': 'Réparation Faitière',
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
        'difficile': 'Accès malaisé',
        'tres-difficile': 'Très malaisé (grande hauteur)',
        'economique': 'Économique',
        'standard': 'Standard',
        'premium': 'Premium',
        'haut-gamme': 'Haut de gamme',
        'urgence': 'Urgent (fuite en cours)',
        'sous-2-semaines': 'D’ici deux semaines',
        'dans-le-mois': 'Dans le mois',
        'pas-presse': 'Pas pressé'
    };
    
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
                        <h3>Quel est le prix d'un couvreur ${deptDet}${deptDet.endsWith("'")?'':' '}${dept} ?</h3>
                        <p class="estimator-subtitle">Estimation personnalisée basée sur les tarifs locaux ${deptDet}${deptDet.endsWith("'")?'':' '}${dept} (${deptNum})</p>
                        <div class="estimator-badge">
                            <span>✅</span> Réponse immédiate • Tarifs actuels • Sans démarcharge
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
                // Convertir le nom du service en data-value (minuscules, sans accents, avec tirets)
                const dataValue = service
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                
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
                <h4>Sur quoi souhaitez-vous intervenir ?</h4>
                <div class="estimator-options">
                    ${servicesHTML}
                </div>
            `,
            2: `
                <h4>De quel type de bâtiment s’agit-il ?</h4>
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
                <h4>Quelle surface de toit est concernée ?</h4>
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
                <h4>L’accès au toit est-il compliqué ?</h4>
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
                        <span>Accès malaisé</span>
                    </button>
                    <button class="estimator-option" data-value="tres-difficile">
                        <span class="option-icon">⛰️</span>
                        <span>Très malaisé (grande hauteur)</span>
                    </button>
                </div>
                <button class="btn-back">← Retour</button>
            `,
            6: `
                <h4>Quel niveau de fournitures visez-vous ?</h4>
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
                <h4>Dans quels délais souhaitez-vous démarrer ?</h4>
                <div class="estimator-options">
                    <button class="estimator-option" data-value="urgence">
                        <span class="option-icon">🚨</span>
                        <span>C'est urgent (fuite en cours)</span>
                    </button>
                    <button class="estimator-option" data-value="sous-2-semaines">
                        <span class="option-icon">⏱️</span>
                        <span>D’ici deux semaines</span>
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
                    <h4>Votre chiffrage sur mesure vous attend</h4>
                    <p class="form-subtitle">Un couvreur vous répond en moins de 24h</p>
                    
                    <form id="estimator-contact-form" class="estimator-contact-form">
                        <div class="form-group">
                            <input type="text" id="est-nom" name="nom" required placeholder="Votre nom">
                        </div>
                        
                        <div class="form-group">
                            <input type="email" id="est-email" name="email" required placeholder="Votre email">
                        </div>
                        
                        <div class="form-group">
                            <input type="tel" id="est-tel" name="telephone" required placeholder="Votre téléphone">
                        </div>
                        
                        <button type="submit" class="btn-submit-estimator">📧 M'envoyer mon chiffrage</button>
                    </form>
                    
                    <div class="estimator-success" id="estimator-success" style="display: none;">
                        <div class="success-icon">✅</div>
                        <h4>C’est envoyé !</h4>
                        <p>Nous revenons vers vous très vite.</p>
                    </div>
                    
                    <button class="btn-back">← Retour</button>
                </div>
            `
        };

        return steps[step] || '';
    }

    function computeEstimate(state) {
        // Conversion des clés de state vers les labels français
        const work = VALUE_TO_LABEL[state.workType];
        const housing = VALUE_TO_LABEL[state.housingType];
        const surface = VALUE_TO_LABEL[state.surface];
        const location = VALUE_TO_LABEL[state.location];
        const access = VALUE_TO_LABEL[state.access];
        const material = VALUE_TO_LABEL[state.materials];
        const deadline = VALUE_TO_LABEL[state.delay];

        // Valeurs de base
        const basePerM2 = BASE_BY_WORK[work];
        const refM2 = SURFACE_BUCKET[surface];

        // Coefficients
        const fHousing = HOUSING_FACTOR[housing] ?? 1.00;
        const fLoc = LOCATION_FACTORS[location] ?? 1.00;
        const fAccess = ACCESS_FACTOR[access] ?? 1.00;
        const fMat = MATERIAL_FACTOR[material] ?? 1.00;
        const fDelay = DEADLINE_FACTOR[deadline] ?? 1.00;

        // Base × surface
        const base = basePerM2 * refM2;

        // Application des coefficients
        let total = base * fHousing * fLoc * fAccess * fMat * fDelay;

        // Fourchette
        const min = Math.round(total * 0.90);
        const max = Math.round(total * 1.20);

        // Indication horaire
        const hourly = HOURLY_HINT[work] || "—";

        // Formatage FR
        const fmt = n => n.toLocaleString("fr-FR") + " €";

        return {
            amountMin: min,
            amountMax: max,
            displayMin: fmt(min),
            displayMax: fmt(max),
            hourlyHint: hourly
        };
    }

    function showResults() {
        const result = computeEstimate(estimatorData);
        const dept = window.BRAND_DEPARTMENT || 'Vendée';
        const deptNum = window.BRAND_DEPARTMENT_NUMBER || '85';
        const deptDet = window.BRAND_DEPARTMENT_DETERMINER || 'en';

        const resultHTML = `
            <div class="estimator-result">
                <div class="result-price-box">
                    <h4>Estimation pour ${dept} (${deptNum}) :</h4>
                    <div class="price-range">${result.displayMin} - ${result.displayMax}</div>
                    <p class="result-info">
                        📍 Tarifs basés sur les spécialistes locaux ${deptDet}${deptDet.endsWith("'")?'':' '}${dept} (${deptNum})<br>
                        Estimation indicative — un devis gratuit est recommandé pour un prix précis
                    </p>
                </div>

                <div class="result-cta">
                    <button class="btn-quote-popup">📞 Demander mon chiffrage offert</button>
                </div>

                <button class="btn-reset">🔄 Refaire une estimation</button>
            </div>
        `;

        document.getElementById('estimator-content').innerHTML = resultHTML;
        updateProgress(100);
        
        // Attacher l'événement au bouton reset
        const resetBtn = document.querySelector('.btn-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', reset);
        }

        // Attacher l'événement au bouton devis
        const quoteBtn = document.querySelector('.btn-quote-popup');
        if (quoteBtn) {
            quoteBtn.addEventListener('click', openQuotePopup);
        }
    }

    function openQuotePopup() {
        const result = computeEstimate(estimatorData);
        
        const popupHTML = `
            <div class="quote-popup-overlay" id="quote-popup-overlay">
                <div class="quote-popup">
                    <button class="popup-close" id="popup-close">&times;</button>
                    <h3>Obtenir un chiffrage sur mesure</h3>
                    <p class="popup-price">Estimation : ${result.displayMin} - ${result.displayMax}</p>
                    
                    <form id="quote-form" class="quote-form">
                        <input type="hidden" name="estimation_min" value="${result.amountMin}">
                        <input type="hidden" name="estimation_max" value="${result.amountMax}">
                        <input type="hidden" name="travaux" value="${VALUE_TO_LABEL[estimatorData.workType]}">
                        <input type="hidden" name="logement" value="${VALUE_TO_LABEL[estimatorData.housingType]}">
                        <input type="hidden" name="surface" value="${VALUE_TO_LABEL[estimatorData.surface]}">
                        <input type="hidden" name="localisation" value="${VALUE_TO_LABEL[estimatorData.location]}">
                        <input type="hidden" name="acces" value="${VALUE_TO_LABEL[estimatorData.access]}">
                        <input type="hidden" name="materiaux" value="${VALUE_TO_LABEL[estimatorData.materials]}">
                        <input type="hidden" name="delai" value="${VALUE_TO_LABEL[estimatorData.delay]}">
                        
                        <div class="form-group">
                            <label for="quote-nom">Nom *</label>
                            <input type="text" id="quote-nom" name="nom" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="quote-email">Email *</label>
                            <input type="email" id="quote-email" name="email" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="quote-tel">Téléphone *</label>
                            <input type="tel" id="quote-tel" name="telephone" required>
                        </div>
                        
                        <button type="submit" class="btn-submit-quote">Envoyer ma demande</button>
                    </form>
                    
                    <div class="quote-success" id="quote-success">
                        ✅ Votre demande a été envoyée avec succès !<br>
                        Nous revenons vers vous très vite.
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', popupHTML);
        
        // Événements popup
        const overlay = document.getElementById('quote-popup-overlay');
        const closeBtn = document.getElementById('popup-close');
        const form = document.getElementById('quote-form');
        const successMsg = document.getElementById('quote-success');
        
        closeBtn.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            
            // Préparer les données pour send-email.php (format compatible)
            const emailData = {
                type: 'estimateur',
                nom: data.nom,
                email: data.email,
                telephone: data.telephone,
                estimation_min: data.estimation_min,
                estimation_max: data.estimation_max,
                travaux: data.travaux,
                logement: data.logement,
                surface: data.surface,
                localisation: data.localisation,
                acces: data.acces,
                materiaux: data.materiaux,
                delai: data.delai
            };
            
            
            try {
                const submitBtn = form.querySelector('.btn-submit-quote');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Envoi en cours...';
                
                await sendToWebhook(emailData);

                form.style.display = 'none';
                successMsg.style.display = 'block';
                
                setTimeout(() => {
                    overlay.remove();
                }, 3000);
            } catch (error) {
                alert('Erreur lors de l\'envoi. Merci de réessayer, ou appelez-nous directement.');
                const submitBtn = form.querySelector('.btn-submit-quote');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Envoyer ma demande';
            }
        });
    }

    function attachFormSubmitListener() {
        const form = document.getElementById('estimator-contact-form');
        const successMsg = document.getElementById('estimator-success');
        
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            
            const formData = new FormData(form);
            
            // Préparer les données pour send-email.php
            const emailData = {
                type: 'estimateur',
                nom: formData.get('nom'),
                email: formData.get('email'),
                telephone: formData.get('telephone'),
                message: formData.get('message') || '',
                travaux: VALUE_TO_LABEL[estimatorData.workType] || estimatorData.workType || 'Non spécifié',
                logement: VALUE_TO_LABEL[estimatorData.housingType] || estimatorData.housingType || 'Non spécifié',
                surface: VALUE_TO_LABEL[estimatorData.surface] || estimatorData.surface || 'Non spécifié',
                localisation: VALUE_TO_LABEL[estimatorData.location] || estimatorData.location || 'Non spécifié',
                acces: VALUE_TO_LABEL[estimatorData.access] || estimatorData.access || 'Non spécifié',
                materiaux: VALUE_TO_LABEL[estimatorData.materials] || estimatorData.materials || 'Non spécifié',
                delai: VALUE_TO_LABEL[estimatorData.delay] || estimatorData.delay || 'Non spécifié'
            };
            
            
            try {
                const submitBtn = form.querySelector('.btn-submit-estimator');
                submitBtn.disabled = true;
                submitBtn.textContent = '⏳ Envoi en cours...';

                await sendToWebhook(emailData);

                form.style.display = 'none';
                successMsg.style.display = 'block';
                
                // Réinitialiser après 5 secondes
                setTimeout(() => {
                    reset();
                }, 5000);
            } catch (error) {
                alert('Erreur lors de l\'envoi. Merci de réessayer, ou appelez-nous directement.');
                const submitBtn = form.querySelector('.btn-submit-estimator');
                const originalText = 'Envoyer ma demande';
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
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
