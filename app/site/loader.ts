// The opening (components/PageLoader) plays once per visit. These live here, outside the client component, because
// the root layout (a server component) puts the script in <head>.

/** Set once the opening has played in this tab: later page loads in the same visit go straight to the page */
export const LOADER_SEEN = 'inta-loader-seen';

/** Runs in <head> before the first paint, so a visitor who has already seen the opening never sees it flash */
export const LOADER_SCRIPT = `try{if(sessionStorage.getItem('${LOADER_SEEN}'))document.documentElement.dataset.loader='seen'}catch(e){}`;
