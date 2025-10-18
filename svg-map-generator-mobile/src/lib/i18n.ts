export type Locale = "en" | "ru";

type LanguageNames = Record<Locale, string>;
type LanguageShort = Record<Locale, string>;

type CommonMessages = {
  appName: string;
  themeToggleAria: string;
  languageToggleAria: string;
  switchToLanguage: string;
  languageNames: LanguageNames;
  languageShort: LanguageShort;
};

type PageMessages = {
  strapline: string;
  headline: string;
  description: string;
};

type MapMessages = {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  searchButtonLabel: string;
  searchButtonSr: string;
  searchErrors: {
    empty: string;
    notFound: string;
    unexpected: string;
  };
  loadingMap: string;
  boundsPrompt: string;
  previewHeading: string;
  previewZoom: string;
  previewStatus: {
    rendering: string;
    error: string;
    idle: string;
  };
  previewAlt: string;
  previewCanvasError: string;
  previewConvertError: string;
  previewOutdatedBadge: string;
  previewDirtyNotice: string;
  areaSection: {
    title: string;
    approximate: string;
    zoomTip: string;
  };
  strokeHeading: string;
  strokeDescription: string;
  outlinesLabel: string;
  generateHeading: string;
  generateButton: string;
  generateButtonLoading: string;
  downloadHeading: string;
  downloadButton: string;
  downloadHint: string;
  downloadUnavailable: string;
  poweredBy: string;
  footerNote: string;
  errors: {
    noBounds: string;
    exportFailed: string;
    exportTimeout: string;
    exportGeneric: string;
    previewFailed: string;
  };
  downloadDirtyWarning: string;
};

export type Messages = {
  common: CommonMessages;
  page: PageMessages;
  map: MapMessages;
};

const translations: Record<Locale, Messages> = {
  en: {
    common: {
      appName: "Map Vector Studio",
      themeToggleAria: "Toggle color theme",
      languageToggleAria: "Switch language",
      switchToLanguage: "Switch to {language}",
      languageNames: {
        en: "English",
        ru: "Русский",
      },
      languageShort: {
        en: "EN",
        ru: "RU",
      },
    },
    page: {
      strapline: "Map Vector Studio",
      headline:
        "Choose any OpenStreetMap window and download it as crisp SVG.",
      description:
        "Pan, zoom, and finesse the map. When it looks right, generate a shareable SVG that keeps every line sharp in your design tools.",
    },
    map: {
      title: "OpenStreetMap SVG Export",
      subtitle:
        "Pan and zoom to the area you want, then download an SVG vector snapshot of the data.",
      searchPlaceholder: "Search cities, addresses, landmarks…",
      searchButtonLabel: "Search the map",
      searchButtonSr: "Search",
      searchErrors: {
        empty: "Enter a place or address to search.",
        notFound: "Unable to find that location.",
        unexpected: "Unexpected error performing search.",
      },
      loadingMap: "Loading map…",
      boundsPrompt: "Adjust the map to choose a region.",
      previewHeading: "Preview",
      previewZoom: "{value}× zoom",
      previewStatus: {
        rendering: "Rendering preview…",
        error: "Unable to render preview.",
        idle: "Generate a preview to see the exported SVG.",
      },
      previewAlt: "Map preview",
      previewCanvasError: "Unable to render preview canvas.",
      previewConvertError: "Unable to convert SVG preview to PNG.",
      previewOutdatedBadge:
        'Preview out of date — run "Generate preview" again.',
      previewDirtyNotice:
        "The preview changed. Generate a new preview before downloading.",
      areaSection: {
        title: "Current bounds",
        approximate: "Approximate area:",
        zoomTip:
          "Tip: Zoom in further to avoid slow Overpass responses and enormous SVG files.",
      },
      strokeHeading: "1. Adjust outline thickness",
      strokeDescription:
        "Use the slider to fine-tune the border weight applied to exported map features.",
      outlinesLabel: "Outlines",
      generateHeading: "2. Generate a fresh preview",
      generateButton: "Generate preview",
      generateButtonLoading: "Generating…",
      downloadHeading: "3. Save the SVG",
      downloadButton: "Save SVG",
      downloadHint: "Share the full-resolution SVG or choose “Save to Files” to keep a copy.",
      downloadUnavailable: "Sharing is not available on this device.",
      poweredBy:
        "Powered by the public Overpass API. For production use, consider hosting your own Overpass instance or caching requests to stay within usage policies.",
      footerNote:
        "SVG exports include roads, buildings, and points of interest present in the selected map window.",
      errors: {
        noBounds: "Move the map to select a region first.",
        exportFailed: "Failed to generate SVG preview.",
        exportTimeout: "Overpass API timed out. Please zoom in or try again.",
        exportGeneric: "Something went wrong while exporting the map.",
        previewFailed: "Unable to generate preview.",
      },
      downloadDirtyWarning:
        "The preview changed. Generate a new preview before downloading.",
    },
  },
  ru: {
    common: {
      appName: "Map Vector Studio",
      themeToggleAria: "Переключить тему",
      languageToggleAria: "Сменить язык",
      switchToLanguage: "Переключить на {language}",
      languageNames: {
        en: "English",
        ru: "Русский",
      },
      languageShort: {
        en: "EN",
        ru: "RU",
      },
    },
    page: {
      strapline: "Map Vector Studio",
      headline:
        "Выберите любой участок OpenStreetMap и скачайте его в виде четкого SVG.",
      description:
        "Двигайте и увеличивайте карту. Когда всё будет готово, скачайте SVG — линии останутся чёткими.",
    },
    map: {
      title: "Экспорт SVG из OpenStreetMap",
      subtitle:
        "Перемещайте и масштабируйте карту до нужного участка, затем скачайте векторный SVG с данными.",
      searchPlaceholder: "Ищите города, адреса, достопримечательности…",
      searchButtonLabel: "Найти на карте",
      searchButtonSr: "Поиск",
      searchErrors: {
        empty: "Введите место или адрес.",
        notFound: "Не удалось найти это место.",
        unexpected: "Произошла непредвиденная ошибка при поиске.",
      },
      loadingMap: "Загрузка карты…",
      boundsPrompt: "Переместите карту, чтобы выбрать область.",
      previewHeading: "Превью",
      previewZoom: "{value}× масштаб",
      previewStatus: {
        rendering: "Рендерим превью…",
        error: "Не удалось отрисовать превью.",
        idle: "Создайте превью, чтобы увидеть экспортируемый SVG.",
      },
      previewAlt: "Превью карты",
      previewCanvasError: "Не удалось отрисовать canvas для превью.",
      previewConvertError: "Не удалось преобразовать SVG-превью в PNG.",
      previewOutdatedBadge:
        "Превью устарело — нажмите «Создать превью» ещё раз.",
      previewDirtyNotice:
        "Превью изменилось. Создайте новое перед скачиванием.",
      areaSection: {
        title: "Текущие границы",
        approximate: "Примерная площадь:",
        zoomTip:
          "Совет: приблизьте карту, чтобы избежать медленных ответов Overpass и огромных SVG-файлов.",
      },
      strokeHeading: "1. Настройте толщину контуров",
      strokeDescription:
        "Используйте ползунок, чтобы настроить толщину контуров экспортируемых объектов.",
      outlinesLabel: "Контуры",
      generateHeading: "2. Создайте новое превью",
      generateButton: "Создать превью",
      generateButtonLoading: "Создание…",
      downloadHeading: "3. Сохраните SVG",
      downloadButton: "Сохранить SVG",
      downloadHint:
        "Поделитесь полноразмерным SVG или выберите «Сохранить в Файлы», чтобы оставить копию.",
      downloadUnavailable: "Совместное использование недоступно на этом устройстве.",
      poweredBy:
        "Работает на публичном Overpass API. Для продакшена используйте свой сервер Overpass или кешируйте запросы, чтобы оставаться в рамках ограничений.",
      footerNote:
        "SVG включает дороги, здания и точки интереса в выбранном окне карты.",
      errors: {
        noBounds: "Сначала выберите область на карте.",
        exportFailed: "Не удалось создать SVG-превью.",
        exportTimeout:
          "Overpass API не ответил вовремя. Попробуйте приблизить карту или повторить позже.",
        exportGeneric: "При экспорте карты что-то пошло не так.",
        previewFailed: "Не удалось создать превью.",
      },
      downloadDirtyWarning:
        "Превью изменилось. Создайте новое перед скачиванием.",
    },
  },
};

export function getMessages(locale: Locale): Messages {
  return translations[locale];
}

export const supportedLocales: Locale[] = ["en", "ru"];
