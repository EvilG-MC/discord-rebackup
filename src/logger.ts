/**
 * Système de journalisation pour discord-rebackup
 * Permet d'afficher des logs de débogage uniquement si le mode développeur est activé
 */

// État global du mode développeur
let devModeEnabled = false;

/**
 * Active le mode développeur pour les logs
 */
export const enableDevMode = (): void => {
    devModeEnabled = true;
};

/**
 * Désactive le mode développeur pour les logs
 */
export const disableDevMode = (): void => {
    devModeEnabled = false;
};

/**
 * Vérifie si le mode développeur est activé
 */
export const isDevModeEnabled = (): boolean => {
    return devModeEnabled;
};

/**
 * Log de débogage - affiché uniquement si le mode développeur est activé
 * @param message Message à afficher
 * @param args Arguments supplémentaires
 */
export const debug = (message: string, ...args: any[]): void => {
    if (devModeEnabled) {
        console.log(`[DEBUG] ${message}`, ...args);
    }
};

/**
 * Log de débogage pour le chargement - affiché uniquement si le mode développeur est activé
 * @param message Message à afficher
 * @param args Arguments supplémentaires
 */
export const debugLoad = (message: string, ...args: any[]): void => {
    if (devModeEnabled) {
        console.log(`[DEBUG LOAD] ${message}`, ...args);
    }
};

/**
 * Log d'erreur - toujours affiché
 * @param message Message d'erreur
 * @param args Arguments supplémentaires
 */
export const error = (message: string, ...args: any[]): void => {
    console.error(`[ERROR] ${message}`, ...args);
};

/**
 * Log d'information - toujours affiché
 * @param message Message d'information
 * @param args Arguments supplémentaires
 */
export const info = (message: string, ...args: any[]): void => {
    console.log(`[INFO] ${message}`, ...args);
};

/**
 * Log d'avertissement - toujours affiché
 * @param message Message d'avertissement
 * @param args Arguments supplémentaires
 */
export const warn = (message: string, ...args: any[]): void => {
    console.warn(`[WARN] ${message}`, ...args);
};
