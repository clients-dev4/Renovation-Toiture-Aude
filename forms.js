/* Envoi du formulaire de devis : webhook WebPrime + formsubmit, en parallele. */
(function () {
    'use strict';

    var WEBHOOK_URL = 'https://webprime.app/webhook/contact/39ddecd3a33cd463499b254e8b2d124a6af45a5d7746503daf03ed250f978440';
    var MAIL_URL = 'https://formsubmit.co/ajax/conceptsfacades@gmail.com';

    function val(form, name) {
        var field = form.querySelector('[name="' + name + '"]');
        return field ? field.value.trim() : '';
    }

    function setError(form, name, show) {
        var field = form.querySelector('[name="' + name + '"]');
        var hint = document.getElementById(name + '-error');
        if (field) field.setAttribute('aria-invalid', show ? 'true' : 'false');
        if (hint) hint.style.display = show ? 'block' : 'none';
    }

    function validate(form) {
        var ok = true;
        var checks = {
            nom: val(form, 'nom').length >= 2,
            telephone: /^(\+33|0)[1-9](\d{2}){4}$/.test(val(form, 'telephone').replace(/[\s.-]/g, '')),
            email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val(form, 'email')),
            message: val(form, 'message').length >= 10
        };
        Object.keys(checks).forEach(function (name) {
            setError(form, name, !checks[name]);
            if (!checks[name]) ok = false;
        });
        return ok;
    }

    function showThanks(form) {
        var thanks = document.getElementById('success-message');
        if (!thanks) {
            thanks = document.createElement('div');
            thanks.className = 'success-message';
            thanks.id = 'success-message';
            thanks.textContent = 'Merci, votre demande a bien ete envoyee. Nous vous recontactons rapidement.';
            form.parentNode.insertBefore(thanks, form.nextSibling);
        }
        form.style.display = 'none';
        thanks.style.display = 'block';
    }

    function send(e) {
        e.preventDefault();
        var form = e.currentTarget;
        var honey = form.querySelector('[name="_honey"]');
        if (honey && honey.value) return false;
        if (!validate(form)) return false;

        var btn = form.querySelector('button[type="submit"]');
        var label = btn ? btn.textContent : '';
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Envoi en cours...';
        }

        var nom = val(form, 'nom');
        var tel = val(form, 'telephone');
        var email = val(form, 'email');
        var message = val(form, 'message');

        var hook = new FormData();
        hook.append('name', nom);
        hook.append('email', email);
        hook.append('tel', tel);
        hook.append('service', 'Demande de devis - ' + document.title);
        hook.append('message', 'Telephone : ' + tel + '\nPage : ' + location.href + '\n\n' + message);

        var mail = new FormData(form);
        var defaults = {
            _subject: 'Nouvelle demande de devis - rt-couvreur-11.fr',
            _captcha: 'false',
            _template: 'table'
        };
        Object.keys(defaults).forEach(function (key) {
            if (!mail.get(key)) mail.set(key, defaults[key]);
        });

        var p1 = fetch(WEBHOOK_URL, { method: 'POST', body: hook, keepalive: true }).catch(function () {});
        var p2 = fetch(MAIL_URL, {
            method: 'POST',
            body: mail,
            keepalive: true,
            headers: { Accept: 'application/json' }
        }).catch(function () {});

        var done = false;
        var finish = function () {
            if (done) return;
            done = true;
            if (btn) {
                btn.disabled = false;
                btn.textContent = label;
            }
            showThanks(form);
        };
        Promise.all([p1, p2]).then(finish);
        setTimeout(finish, 4000);
        return false;
    }

    function init() {
        var form = document.getElementById('devis-form');
        if (!form) return;
        form.removeAttribute('action');
        form.addEventListener('submit', send);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
