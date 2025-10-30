import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AppState, Coordinates, DeviceOrientation, MoonPosition } from './types';
import { getMoonBlessing } from './services/geminiService';

// Declare SunCalc for TypeScript since it's loaded from a script tag
declare const SunCalc: any;

const VIEW_THRESHOLD = 5; // degrees within which the moon is considered "in view"
const HORIZONTAL_FOV = 60; // Approximate horizontal field of view for a mobile camera
const VERTICAL_FOV = 80;   // Approximate vertical field of view

const LANGUAGES: Record<string, string> = {
  en: 'English',
  es: 'Español',
  he: 'עברית',
  de: 'Deutsch',
  fr: 'Français',
  zh: '中文',
  ru: 'Русский',
};

const translations: Record<string, Record<string, string>> = {
  en: { title: 'Find the Moon and Bless It', subtitle: 'An AR guide to the night sky.', beginSearch: 'Begin Search', calibrating: 'Calibrating sensors...', errorTitle: 'Error', locationError: 'Could not get your location. Please enable location services.', permissionError: 'Camera and location access are required. Please grant permissions and refresh.', unexpectedError: 'An unexpected error occurred. Please refresh the page.', tryAgain: 'Try Again', sensorWait: 'Waiting for sensor data...', sensorHint: 'Please move your device around slowly.', receiveBlessing: 'Receive Blessing', receiving: 'Receiving...', close: 'Close', language: 'Language', settings: 'Settings', crosshairColor: 'Viewfinder Color', about: 'About', aboutText: 'Noam Gold Google AI Studio 2025', moonVisibility: 'Moon Visibility', traditionalBlessing: 'Traditional Blessing', traditionalBlessingTitle: 'Blessing of the Moon' },
  es: { title: 'Encuentra la Luna y Bendícela', subtitle: 'Una guía de RA para el cielo nocturno.', beginSearch: 'Iniciar Búsqueda', calibrating: 'Calibrando sensores...', errorTitle: 'Error', locationError: 'No se pudo obtener tu ubicación. Por favor, activa los servicios de ubicación.', permissionError: 'Se requiere acceso a la cámara y la ubicación. Por favor, concede los permisos y actualiza.', unexpectedError: 'Ocurrió un error inesperado. Por favor, actualiza la página.', tryAgain: 'Intentar de Nuevo', sensorWait: 'Esperando datos de los sensores...', sensorHint: 'Por favor, mueve tu dispositivo lentamente.', receiveBlessing: 'Recibir Bendición', receiving: 'Recibiendo...', close: 'Cerrar', language: 'Idioma', settings: 'Ajustes', crosshairColor: 'Color del Visor', about: 'Acerca de', aboutText: 'Noam Gold Google AI Studio 2025', moonVisibility: 'Visibilidad Lunar', traditionalBlessing: 'Bendición Tradicional', traditionalBlessingTitle: 'Bendición de la Luna' },
  he: { title: 'מצא את הירח וברך אותו', subtitle: 'מדריך AR לשמי הלילה.', beginSearch: 'התחל חיפוש', calibrating: 'מכייל חיישנים...', errorTitle: 'שגיאה', locationError: 'לא ניתן היה לקבל את מיקומך. אנא אפשר שירותי מיקום.', permissionError: 'נדרשת גישה למצלמה ולמיקום. אנא הענק הרשאות ורענן.', unexpectedError: 'אירעה שגיאה בלתי צפויה. אנא רענן את הדף.', tryAgain: 'נסה שוב', sensorWait: 'ממתין לנתוני חיישנים...', sensorHint: 'אנא הזז את המכשיר שלך לאט.', receiveBlessing: 'קבל ברכה', receiving: 'מקבל...', close: 'סגור', language: 'שפה', settings: 'הגדרות', crosshairColor: 'צבע הכוונת', about: 'אודות', aboutText: 'נועם גולד גוגל AI סטודיו 2025', moonVisibility: 'נראות הירח', traditionalBlessing: 'ברכת הלבנה', traditionalBlessingTitle: 'ברכת הלבנה' },
  de: { title: 'Finde den Mond und Segne Ihn', subtitle: 'Ein AR-Führer für den Nachthimmel.', beginSearch: 'Suche starten', calibrating: 'Sensoren werden kalibriert...', errorTitle: 'Fehler', locationError: 'Dein Standort konnte nicht ermittelt werden. Bitte aktiviere die Ortungsdienste.', permissionError: 'Kamera- und Standortzugriff sind erforderlich. Bitte erteile die Berechtigungen und aktualisiere.', unexpectedError: 'Ein unerwarteter Fehler ist aufgetreten. Bitte lade die Seite neu.', tryAgain: 'Erneut versuchen', sensorWait: 'Warte auf Sensordaten...', sensorHint: 'Bitte bewege dein Gerät langsam.', receiveBlessing: 'Segen empfangen', receiving: 'Empfange...', close: 'Schließen', language: 'Sprache', settings: 'Einstellungen', crosshairColor: 'Sucherfarbe', about: 'Über', aboutText: 'Noam Gold Google AI Studio 2025', moonVisibility: 'Mondsichtbarkeit', traditionalBlessing: 'Traditioneller Segen', traditionalBlessingTitle: 'Segen des Mondes' },
  fr: { title: 'Trouvez la Lune et Bénissez-la', subtitle: 'Un guide en RA du ciel nocturne.', beginSearch: 'Commencer la recherche', calibrating: 'Calibrage des capteurs...', errorTitle: 'Erreur', locationError: "Impossible d'obtenir votre position. Veuillez activer les services de localisation.", permissionError: "L'accès à la caméra et à la localisation est requis. Veuillez accorder les autorisations et rafraîchir.", unexpectedError: "Une erreur inattendue s'est produite. Veuillez rafraîchir la page.", tryAgain: 'Réessayer', sensorWait: 'En attente des données des capteurs...', sensorHint: 'Veuillez déplacer votre appareil lentement.', receiveBlessing: 'Recevoir la bénédiction', receiving: 'Réception...', close: 'Fermer', language: 'Langue', settings: 'Paramètres', crosshairColor: 'Couleur du Viseur', about: 'À propos', aboutText: 'Noam Gold Google AI Studio 2025', moonVisibility: 'Visibilité de la Lune', traditionalBlessing: 'Bénédiction Traditionnelle', traditionalBlessingTitle: 'Bénédiction de la Lune' },
  zh: { title: '寻找月亮并祝福它', subtitle: '夜空的AR指南。', beginSearch: '开始搜索', calibrating: '正在校准传感器...', errorTitle: '错误', locationError: '无法获取您的位置。请启用定位服务。', permissionError: '需要相机和位置权限。请授予权限并刷新。', unexpectedError: '发生意外错误。请刷新页面。', tryAgain: '再试一次', sensorWait: '等待传感器数据...', sensorHint: '请缓慢移动您的设备。', receiveBlessing: '接受祝福', receiving: '正在接收...', close: '关闭', language: '语言', settings: '设置', crosshairColor: '取景器颜色', about: '关于', aboutText: '诺姆·戈尔德 谷歌AI工作室 2025', moonVisibility: '月球可见度', traditionalBlessing: '传统祝福', traditionalBlessingTitle: '月亮祝福' },
  ru: { title: 'Найди Луну и Благослови Ее', subtitle: 'AR-гид по ночному небу.', beginSearch: 'Начать поиск', calibrating: 'Калибровка датчиков...', errorTitle: 'Ошибка', locationError: 'Не удалось получить ваше местоположение. Пожалуйста, включите службы геолокации.', permissionError: 'Требуется доступ к камере и местоположению. Пожалуйста, предоставьте разрешения и обновите страницу.', unexpectedError: 'Произошла непредвиденная ошибка. Пожалуйста, обновите страницу.', tryAgain: 'Попробовать снова', sensorWait: 'Ожидание данных с датчиков...', sensorHint: 'Пожалуйста, медленно перемещайте ваше устройство.', receiveBlessing: 'Получить благословение', receiving: 'Получение...', close: 'Закрыть', language: 'Язык', settings: 'Настройки', crosshairColor: 'Цвет видоискателя', about: 'О программе', aboutText: 'Ноам Голд Google AI Studio 2025', moonVisibility: 'Видимость Луны', traditionalBlessing: 'Традиционное благословение', traditionalBlessingTitle: 'Благословение Луны' },
};

const sephardicBlessingText = (
  <div dir="rtl" className="text-right space-y-4 font-serif text-lg leading-relaxed">
    <p className="italic text-sm text-gray-600 dark:text-gray-400">נהוג לומר קודם את הפסוקים הבאים:</p>
    <p>
      לַמְנַצֵּחַ מִזְמוֹר לְדָוִד. הַשָּׁמַיִם מְסַפְּרִים כְּבוֹד אֵל וּמַעֲשֵׂה יָדָיו מַגִּיד הָרָקִיעַ. יוֹם לְיוֹם יַבִּיעַ אֹמֶר וְלַיְלָה לְּלַיְלָה יְחַוֶּה דָּעַת. אֵין אֹמֶר וְאֵין דְּבָרִים בְּלִי נִשְׁמָע קוֹלָם. בְּכָל הָאָרֶץ יָצָא קַוָּם וּבִקְצֵה תֵבֵל מִלֵיהֶם לַשֶּׁמֶשׁ שָׂם אֹהֶל בָּהֶם. וְהוּא כְּחָתָן יֹצֵא מֵחֻפָּתוֹ יָשִׂישׂ כְּגִבּוֹר לָרוּץ אֹרַח. מִקְצֵה הַשָּׁמַיִם מוֹצָאוֹ וּתְקוּפָתוֹ עַל קְצוֹתָם וְאֵין נִסְתָּר מֵחַמָּתוֹ. תּוֹרַת יְהוָה תְּמִימָה מְשִׁיבַת נָפֶשׁ עֵדוּת יְהוָה נֶאֱמָנָה מַחְכִּימַת פֶּתִי. פִּקּוּדֵי יְהוָה יְשָׁרִים מְשַׂמְחֵי לֵב מִצְוַת יְהוָה בָּרָה מְאִירַת עֵינָיִם. יִרְאַת יְהוָה טְהוֹרָה עוֹמֶדֶת לָעַד מִשְׁפְטֵי יְהוָה אֱמֶת צָדְקוּ יַחְדָּו. הַנֶּחֱמָדִים מִזָּהָב וּמִפַז רָב וּמְתוּקִים מִדְּבַשׁ וְנֹפֶת צוּפִים. גַּם עַבְדְּךָ נִזְהָר בָּהֶם בְּשָׁמְרָם עֵקֶב רָב. שְׁגִיאוֹת מִי יָבִין מִנִּסְתָּרוֹת נַקֵּנִי. גַּם מִזֵּדִים חֲשׂךְ עַבְדְּךָ אַל יִמְשְׁלוּ בִי אָז אֵיתָם וְנִקֵּיתִי מִפֶּשַע רָב. יִהְיוּ לְרָצוֹן אִמְרֵי פִי וְהֶגְיוֹן לִבִּי לְפָנֶיךָ יְהוָה צוּרִי וְגֹאֲלִי. (תהילים יט)
    </p>
    <p>
      הַלְלוּ יָהּ הַלְלוּ אֶת יְהוָה מִן הַשָּׁמַיִם הַלְלוּהוּ בַּמְּרוֹמִים. הַלְלוּהוּ כָל מַלְאָכָיו הַלְלוּהוּ כָּל צְבָאָיו. הַלְלוּהוּ שֶׁמֶשׁ וְיָרֵחַ הַלְלוּהוּ כָּל כּוֹכְבֵי אוֹר. הַלְלוּהוּ שְׁמֵי הַשָּׁמָיִם וְהַמַּיִם אֲשֶר מֵעַל הַשָּׁמָיִם. יְהַלְלוּ אֶת שֵׁם יְהוָה כִּי הוּא צִוָּה וְנִבְרָאוּ. וַיַּעֲמִידֵם לָעַד לְעוֹלָם חֹק נָתַן וְלֹא יַעֲבוֹר. (תהילים קמח, א-ו)
    </p>
    <p>
    כִּי אֶרְאֶה שָׁמֶיךָ מַעֲשֵׂי אֶצְבְּעֹתֶיךָ יָרֵחַ וְכוֹכָבִים אֲשֶר כּוֹנָנְתָּה. (תהילים ח, ד) יְיָ אֲדֹנֵינוּ מָה אַדִּיר שִׁמְךָ בְּכָל הָאָרֶץ. (תהילים ח, י)
    </p>
    <h3 className="font-bold text-xl pt-2">הברכה העיקרית</h3>
    <p>
      בָּרוּךְ אַתָּה יְיָ, אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶר בְּמַאֲמָרוֹ בָּרָא שְׁחָקִים, וּבְרוּחַ פִּיו כָּל צְבָאָם. חֹק וּזְמַן נָתַן לָהֶם שֶׁלֹּא יְשַנּוּ אֶת תַפְקִידָם. שָׂשִׂים וּשְׂמֵחִים לַעֲשׂוֹת רְצוֹן קוֹנֵיהֶם, פּוֹעֵל אֱמֶת שֶׁפְּעֻלָּתוֹ אֱמֶת. וְלַלְּבָנָה אָמַר שֶׁתִּתְחַדֵּשׁ, עֲטֶרֶת תִּפְאֶרֶת לַעֲמוּסֵי בָטֶן שֶׁהֵם עֲתִידִים לְהִתְחַדֵּשׁ כְּמוֹתָהּ, וּלְפָאֵר לְיוֹצְרָם עַל שֵׁם כְּבוֹד מַלְכוּתוֹ. בָּרוּךְ אַתָּה יְיָ, מְחַדֵּשׁ חֳדָשִׁים.
    </p>
     <h3 className="font-bold text-xl pt-2">לאחר הברכה</h3>
    <p>בְּסִימָן טוֹב תְּהִי לָנוּ וּלְכָל יִשְׂרָאֵל. (ג' פעמים)</p>
    <p>בָּרוּךְ יוֹצְרֵךְ, בָּרוּךְ עוֹשֵׂךְ, בָּרוּךְ קוֹנֵךְ, בָּרוּךְ בּוֹרְאֵךְ. (ג' פעמים)</p>
    <p>
      (רוקדים 3 פעמים ואומרים):<br/>
      כְּשֵׁם שֶׁאֲנַחְנוּ מְרַקְּדִים כְּנֶגְדֵּךְ וְאֵין אֲנַחְנוּ יְכוֹלִים לִגַּע בָּךְ, כַּךְ אִם יְרַקְּדוּ אֲחֵרִים כְּנֶגְדֵּנוּ לְהַזִּיקֵנוּ, לֹא יוּכְלוּ לִגַּע בָּנוּ וְלֹא יִשְׁלְטוּ בָנוּ וְלֹא יַעֲשׂוּ בָנוּ שׁוּם רֹשֶׁם.
    </p>
    <p>תִּפּוֹל עֲלֵיהֶם אֵימָתָה וָפַחַד, בִּגְדֹל זְרוֹעֲךָ יִדְּמוּ כָּאָבֶן. (ג' פעמים)</p>
    <p>כָּאָבֶן יִדְּמוּ זְרוֹעֲךָ בִּגְדֹל וָפַחַד אֵימָתָה עֲלֵיהֶם תִּפּוֹל. (ג' פעמים, המילים בסדר הפוך)</p>
    <p>לֵב טָהוֹר בְּרָא לִי אֱלֹהִים, וְרוּחַ נָכוֹן חַדֵּשׁ בְּקִרְבִּי. (ג' פעמים)</p>
    <p>
      (אומרים זה לזה ג' פעמים):<br/>
      שָׁלוֹם עֲלֵיכֶם - משיבים: עֲלֵיכֶם שָׁלוֹם.
    </p>
    <p>דָּוִד מֶלֶךְ יִשְׂרָאֵל חַי וְקַיָּם. (ג' פעמים)</p>
    <p>אָמֵן, אָמֵן, אָמֵן. נֶצַח, נֶצַח, נֶצַח. סֶלָה, סֶלָה, סֶלָה. וָעֶד, וָעֶד, וָעֶד.</p>
    <p>שִׁיר לַמַּעֲלוֹת אֶשָּׂא עֵינַי אֶל הֶהָרִים מֵאַין יָבֹא עֶזְרִי... (תהילים קכא – 7 פעמים)</p>
    <p>הַלְלוּיָהּ הַלְלוּ אֵל בְּקָדְשׁוֹ... (תהילים קנ – 3 פעמים)</p>
    <p>
      תָּנָא דְּבֵי רִבִּי יִשְׁמָעֵאל אִלְמָלֵי לֹא זָכוּ יִשְׂרָאֵל אֶלָּא לְהַקְבִּיל פְּנֵי אֲבִיהֶם שֶׁבַּשָּׁמַיִם פַּעַם אַחַת בַּחֹדֶשׁ דַּיָּם. אָמַר אַבַּיֵּי הֵלְכָךְ נֵימְרִינְהוּ מֵעוֹמֶד.
    </p>
    <p>וְהָיָה אוֹר הַלְּבָנָה כְּאוֹר הַחַמָּה... (ישעיהו ל, כו)</p>
  </div>
);


const CrosshairIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="60" height="60" viewBox="0 0 100 100" className="absolute" style={{ color: color }} aria-hidden="true">
    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5" />
    <line x1="50" y1="0" x2="50" y2="20" stroke="currentColor" strokeWidth="2" opacity="0.5" />
    <line x1="50" y1="80" x2="50" y2="100" stroke="currentColor" strokeWidth="2" opacity="0.5" />
    <line x1="0" y1="50" x2="20" y2="50" stroke="currentColor" strokeWidth="2" opacity="0.5" />
    <line x1="80" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="2" opacity="0.5" />
  </svg>
);

const MoonTargetIcon: React.FC<{ isFound: boolean }> = ({ isFound }) => (
  <div className={`
    w-16 h-16 rounded-full transition-all duration-500
    ${isFound 
      ? 'bg-yellow-300 shadow-[0_0_30px_10px_rgba(251,191,36,0.6)] dark:bg-white dark:shadow-[0_0_30px_10px_rgba(255,255,255,0.7)]' 
      : 'bg-black/10 dark:bg-white/30 border-2 border-dashed border-black/30 dark:border-white/50'}
  `}></div>
);

const DirectionalArrow: React.FC<{ rotation: number }> = ({ rotation }) => (
  <div
    className="absolute top-1/2 left-1/2 will-change-transform"
    style={{ transform: `rotate(${rotation}deg) translateY(-100px)` }}
    aria-hidden="true"
  >
    <svg width="80" height="120" viewBox="0 0 100 150" className="text-white drop-shadow-lg animate-pulse">
      <path d="M50 0 L100 70 L50 50 L0 70 Z" fill="currentColor" opacity="0.6"/>
    </svg>
  </div>
);

const SunIcon: React.FC = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>);
const MoonIcon: React.FC = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>);
const CloseIcon: React.FC = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>);
const SettingsIcon: React.FC = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V15a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51-1z"></path></svg>);

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.REQUESTING_PERMISSIONS);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [orientation, setOrientation] = useState<DeviceOrientation>({ alpha: null, beta: null, gamma: null });
  const [smoothedOrientation, setSmoothedOrientation] = useState<DeviceOrientation>({ alpha: null, beta: null, gamma: null });
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [moonPosition, setMoonPosition] = useState<MoonPosition | null>(null);
  const [moonIllumination, setMoonIllumination] = useState<number | null>(null);
  const [blessing, setBlessing] = useState<string | null>(null);
  const [isFetchingBlessing, setIsFetchingBlessing] = useState(false);
  const [isTraditionalBlessingOpen, setIsTraditionalBlessingOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  const [language, setLanguage] = useState<string>(() => localStorage.getItem('lunar-guide-language') || 'en');
  const [crosshairColor, setCrosshairColor] = useState<string>(() => localStorage.getItem('lunar-guide-crosshair-color') || '#FFFFFF');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const geoWatchId = useRef<number | null>(null);
  const t = useMemo(() => translations[language] || translations.en, [language]);

  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => { localStorage.setItem('lunar-guide-language', language); }, [language]);
  useEffect(() => { localStorage.setItem('lunar-guide-crosshair-color', crosshairColor); }, [crosshairColor]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('lunar-guide-theme', theme);
  }, [theme]);

  const handleFinishSearch = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (geoWatchId.current !== null) {
      navigator.geolocation.clearWatch(geoWatchId.current);
      geoWatchId.current = null;
    }
    setAppState(AppState.REQUESTING_PERMISSIONS);
    setLocation(null);
    setOrientation({ alpha: null, beta: null, gamma: null });
    setSmoothedOrientation({ alpha: null, beta: null, gamma: null });
    setMoonPosition(null);
    setMoonIllumination(null);
    setBlessing(null);
    setError(null);
  }, []);

  const handlePermissions = useCallback(async () => {
    setAppState(AppState.LOADING);
    try {
      const streamPromise = navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      const locationPromise = new Promise<Coordinates>((resolve, reject) => {
        geoWatchId.current = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude };
            setLocation(newLocation);
            resolve(newLocation);
          },
          reject,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });
      const [stream] = await Promise.all([streamPromise, locationPromise]);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setAppState(AppState.READY);
    } catch (err) {
      if (geoWatchId.current !== null) navigator.geolocation.clearWatch(geoWatchId.current);
      console.error(err);
      if (err instanceof GeolocationPositionError) setError(t.locationError);
      else if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) setError(t.permissionError);
      else setError(t.unexpectedError);
      setAppState(AppState.ERROR);
    }
  }, [t]);

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => setOrientation({ alpha: event.alpha, beta: event.beta, gamma: event.gamma });
    const eventName = 'deviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(eventName, handleOrientation);
    return () => window.removeEventListener(eventName, handleOrientation);
  }, []);

  useEffect(() => {
    // Apply a low-pass filter to smooth out sensor jitter for a more stable UI
    const SMOOTHING_FACTOR = 0.05; // Lower is smoother, but less responsive
    
    setSmoothedOrientation(prev => {
      // If we don't have a previous value or a current value, don't smooth
      if (prev.alpha === null || orientation.alpha === null || prev.beta === null || orientation.beta === null) {
        return orientation;
      }

      // Smooth alpha (compass heading), correcting for the 360->0 degree wraparound
      let deltaAlpha = orientation.alpha - prev.alpha;
      if (deltaAlpha > 180) deltaAlpha -= 360;
      if (deltaAlpha < -180) deltaAlpha += 360;
      const smoothedAlpha = (prev.alpha + deltaAlpha * SMOOTHING_FACTOR + 360) % 360;

      // Smooth beta (pitch)
      const smoothedBeta = prev.beta + (orientation.beta - prev.beta) * SMOOTHING_FACTOR;
      
      // Smooth gamma (roll) - currently unused but good practice
      const smoothedGamma = (prev.gamma ?? 0) + ((orientation.gamma ?? 0) - (prev.gamma ?? 0)) * SMOOTHING_FACTOR;

      return { alpha: smoothedAlpha, beta: smoothedBeta, gamma: smoothedGamma };
    });
  }, [orientation]);

  useEffect(() => {
    if (location) {
      const now = new Date();
      const pos = SunCalc.getMoonPosition(now, location.latitude, location.longitude);
      const azimuthDegrees = (pos.azimuth * 180 / Math.PI + 180) % 360;
      const altitudeDegrees = pos.altitude * 180 / Math.PI;
      setMoonPosition({ azimuth: azimuthDegrees, altitude: altitudeDegrees });
      const illum = SunCalc.getMoonIllumination(now);
      setMoonIllumination(illum.fraction);
    }
  }, [location]);

  const guidance = useMemo(() => {
    // Use the smoothed orientation data for calculations
    if (smoothedOrientation.alpha === null || smoothedOrientation.beta === null || !moonPosition) {
      return { deltaAz: 0, deltaAlt: 0, isMoonInView: false, screenPos: { x: '50%', y: '50%' }, arrowRotation: 0 };
    }

    // Calculate horizontal difference (azimuth) from moon
    let deltaAz = moonPosition.azimuth - smoothedOrientation.alpha;
    // Normalize to the shortest angle (-180 to 180)
    if (deltaAz > 180) deltaAz -= 360;
    if (deltaAz < -180) deltaAz += 360;

    // Correctly calculate device's vertical orientation (altitude)
    // 90 degrees beta is upright (0 altitude), 0 degrees beta is flat facing sky (90 altitude)
    const deviceAltitude = 90 - smoothedOrientation.beta;
    let deltaAlt = moonPosition.altitude - deviceAltitude;
    
    const isMoonInView = Math.abs(deltaAz) < VIEW_THRESHOLD && Math.abs(deltaAlt) < VIEW_THRESHOLD;

    // Calculate the moon's position on screen for the target icon
    const x = 50 + (deltaAz / (HORIZONTAL_FOV / 2)) * 50;
    const y = 50 - (deltaAlt / (VERTICAL_FOV / 2)) * 50;
    const screenX = `${Math.max(5, Math.min(95, x))}%`;
    const screenY = `${Math.max(5, Math.min(95, y))}%`;

    // Calculate the rotation for the central directional arrow
    const arrowRotation = (Math.atan2(-deltaAlt, deltaAz) * 180 / Math.PI) + 90;

    return { isMoonInView, screenPos: { x: screenX, y: screenY }, arrowRotation };
  }, [smoothedOrientation, moonPosition]);
  
  const handleGetBlessing = useCallback(async () => {
    setIsFetchingBlessing(true);
    const text = await getMoonBlessing(language);
    setBlessing(text);
    setIsFetchingBlessing(false);
  }, [language]);

  const renderContent = () => {
    switch (appState) {
      case AppState.REQUESTING_PERMISSIONS:
        return (
          <>
            <div className="flex flex-col items-center justify-center h-full text-center p-4 relative">
              <button onClick={() => setIsSettingsOpen(true)} className="absolute top-4 left-4 p-2 rounded-full bg-gray-500/20 hover:bg-gray-500/40 transition-colors" aria-label={t.settings}>
                <SettingsIcon />
              </button>
              <button onClick={() => setTheme(th => th === 'dark' ? 'light' : 'dark')} className="absolute top-4 right-4 p-2 rounded-full bg-gray-500/20 hover:bg-gray-500/40 transition-colors" aria-label="Toggle theme">
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>
              <h1 className="text-4xl font-bold mb-2">{t.title}</h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">{t.subtitle}</p>
              <button onClick={handlePermissions} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xl font-semibold transition-transform transform hover:scale-105">
                {t.beginSearch}
              </button>
            </div>
            {isSettingsOpen && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-30" onClick={() => setIsSettingsOpen(false)}>
                <div className="bg-gray-100/90 dark:bg-gray-800/90 p-6 rounded-xl shadow-2xl w-full max-w-sm text-center mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                  <h2 className="text-2xl font-bold">{t.settings}</h2>
                  <div>
                    <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.language}</label>
                    <select id="language-select" value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full p-2 rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white">
                      {Object.entries(LANGUAGES).map(([code, name]) => (<option key={code} value={code}>{name}</option>))}
                    </select>
                  </div>
                   <div>
                    <label htmlFor="crosshair-color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.crosshairColor}</label>
                    <input id="crosshair-color" type="color" value={crosshairColor} onChange={(e) => setCrosshairColor(e.target.value)} className="w-full h-10 p-1 bg-white dark:bg-gray-700 rounded-md border-gray-300 dark:border-gray-600 cursor-pointer"/>
                  </div>
                  <button onClick={() => setIsAboutOpen(true)} className="w-full py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors">{t.about}</button>
                  <button onClick={() => setIsSettingsOpen(false)} className="mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white">{t.close}</button>
                </div>
              </div>
            )}
            {isAboutOpen && (
               <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-40" onClick={() => setIsAboutOpen(false)}>
                 <div className="bg-gray-100/90 dark:bg-gray-800/90 p-8 rounded-xl shadow-2xl max-w-sm text-center mx-4" onClick={(e) => e.stopPropagation()}>
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t.aboutText}</p>
                    <button onClick={() => setIsAboutOpen(false)} className="mt-6 text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white">{t.close}</button>
                 </div>
               </div>
            )}
          </>
        );
      case AppState.LOADING:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-500 dark:border-indigo-400"></div>
            <p className="mt-4 text-lg">{t.calibrating}</p>
          </div>
        );
      case AppState.ERROR:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <h2 className="text-2xl text-red-500 dark:text-red-400 font-bold mb-4">{t.errorTitle}</h2>
            <p className="text-lg">{error}</p>
            <button onClick={handleFinishSearch} className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg">{t.tryAgain}</button>
          </div>
        );
      case AppState.READY:
        if (!moonPosition || orientation.alpha === null) {
          return (
             <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-500 dark:border-indigo-400"></div>
              <p className="mt-4 text-lg">{t.sensorWait}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t.sensorHint}</p>
            </div>
          )
        }
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute top-4 left-4 text-xs font-mono bg-black/40 p-2 rounded-md text-white space-y-1">
              <p className="font-bold text-center">-- SENSORS --</p>
              <p>Lat: {location?.latitude.toFixed(2)} Lon: {location?.longitude.toFixed(2)}</p>
              <p>Compass (α): {smoothedOrientation.alpha?.toFixed(1)}°</p>
              <p>Pitch (β): {smoothedOrientation.beta?.toFixed(1)}°</p>
              <hr className="border-white/20 my-1"/>
              <p>{t.moonVisibility}: {moonIllumination !== null ? `${(moonIllumination * 100).toFixed(0)}%` : '...'}</p>
            </div>
            <button onClick={handleFinishSearch} className="absolute top-2 right-2 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors z-20" aria-label={t.close}>
              <CloseIcon />
            </button>
            <CrosshairIcon color={crosshairColor}/>
            {!guidance.isMoonInView && <DirectionalArrow rotation={guidance.arrowRotation} />}
            <div className="absolute transition-all duration-200" style={{left: guidance.isMoonInView ? '50%' : guidance.screenPos.x, top: guidance.isMoonInView ? '50%' : guidance.screenPos.y, transform: 'translate(-50%, -50%)'}}>
              <MoonTargetIcon isFound={guidance.isMoonInView} />
            </div>
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full px-4 text-center">
              {guidance.isMoonInView && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button onClick={handleGetBlessing} disabled={isFetchingBlessing} className="px-6 py-3 bg-green-600/80 backdrop-blur-sm rounded-lg text-white text-lg font-semibold transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed">
                    {isFetchingBlessing ? t.receiving : t.receiveBlessing}
                  </button>
                  <button onClick={() => setIsTraditionalBlessingOpen(true)} className="px-6 py-3 bg-sky-600/80 backdrop-blur-sm rounded-lg text-white text-lg font-semibold transition-transform transform hover:scale-105">
                    {t.traditionalBlessing}
                  </button>
                </div>
              )}
            </div>
            {blessing && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-30" onClick={() => setBlessing(null)}>
                <div className="bg-gray-100/90 dark:bg-gray-800/90 p-8 rounded-xl shadow-2xl max-w-sm text-center mx-4">
                  <p className="text-2xl italic text-indigo-800 dark:text-indigo-200 font-serif">"{blessing}"</p>
                  <button onClick={() => setBlessing(null)} className="mt-6 text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white">{t.close}</button>
                </div>
              </div>
            )}
            {isTraditionalBlessingOpen && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-30" onClick={() => setIsTraditionalBlessingOpen(false)}>
                <div className="bg-gray-100/95 dark:bg-gray-800/95 p-6 rounded-xl shadow-2xl w-full max-w-lg mx-4 h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <h2 className="text-2xl font-bold text-center mb-4">{t.traditionalBlessingTitle}</h2>
                  <div className="flex-grow overflow-y-auto pr-4">
                    {sephardicBlessingText}
                  </div>
                  <button onClick={() => setIsTraditionalBlessingOpen(false)} className="mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white self-center">{t.close}</button>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-gray-100 dark:bg-black text-black dark:text-white">
      <video ref={videoRef} autoPlay playsInline muted className="absolute top-0 left-0 w-full h-full object-cover z-0" />
      <div className="absolute top-0 left-0 w-full h-full z-10">
        {renderContent()}
      </div>
    </div>
  );
};

export default App;
