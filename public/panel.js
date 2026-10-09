/**
 * Panneau latéral Home Assistant pour le dashboard.
 *
 * Home Assistant exige un « webcomponent » pour `panel_custom` et n'accepte pas
 * d'URL de page (`panel_iframe` n'existe plus). Ce petit module définit donc
 * l'élément `<ha-dashboard-panel>` attendu, qui encadre le dashboard dans une
 * iframe.
 *
 * Deux raisons à l'iframe plutôt qu'un montage direct dans le DOM de Home
 * Assistant :
 *  1. le CSS de Home Assistant ne peut pas se mélanger à celui du dashboard ;
 *  2. l'iframe est de même origine, donc @hakit récupère la connexion déjà
 *     authentifiée de Home Assistant (`window.top.hassConnection`) : aucune
 *     reconnexion, aucun jeton à saisir.
 *
 * HAUTEUR : le conteneur fourni par Home Assistant à un panneau personnalisé n'a
 * pas toujours de hauteur définie, auquel cas un `height: 100%` retombe sur la
 * hauteur du contenu et le dashboard n'occupe que le haut de l'écran (bug
 * constaté le 05/10/2026). La hauteur est donc calculée sur l'espace réellement
 * disponible sous le haut du panneau, et recalculée au redimensionnement.
 *
 * Recopié dans /config/www/<dossier>/ par `npm run deploy` (le fichier vit dans
 * public/, Vite le recopie tel quel dans dist/).
 */

const DASHBOARD_URL = '/local/dashboard/index.html';
const HAUTEUR_MINIMALE = 400;

class HaDashboardPanel extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot !== null) {
      return;
    }

    const shadow = this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; width: 100%; }
      iframe {
        display: block;
        width: 100%;
        height: calc(100vh - var(--header-height, 56px));
        border: 0;
      }
    `;

    const iframe = document.createElement('iframe');
    iframe.src = DASHBOARD_URL;
    iframe.title = 'Dashboard maison';

    this._ajusterHauteur = () => {
      // Espace disponible entre le haut du panneau et le bas de la fenêtre :
      // s'adapte tout seul à la hauteur de l'en-tête et à la barre latérale.
      // Borné à la hauteur de la fenêtre (le haut du panneau peut être négatif
      // si Home Assistant fait défiler la zone).
      const haut = this.getBoundingClientRect().top;
      const disponible = Math.min(
        window.innerHeight,
        Math.max(HAUTEUR_MINIMALE, window.innerHeight - haut),
      );
      iframe.style.height = `${disponible}px`;
    };

    window.addEventListener('resize', this._ajusterHauteur);
    window.addEventListener('orientationchange', this._ajusterHauteur);
    window.addEventListener('scroll', this._ajusterHauteur, { passive: true });

    shadow.append(style, iframe);

    // Premier calcul après la mise en page, puis une seconde passe : Home
    // Assistant termine ses transitions de panneau juste après le montage.
    requestAnimationFrame(this._ajusterHauteur);
    this._minuteur = window.setTimeout(this._ajusterHauteur, 300);
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this._ajusterHauteur);
    window.removeEventListener('orientationchange', this._ajusterHauteur);
    window.removeEventListener('scroll', this._ajusterHauteur);
    window.clearTimeout(this._minuteur);
  }
}

if (!customElements.get('ha-dashboard-panel')) {
  customElements.define('ha-dashboard-panel', HaDashboardPanel);
}
