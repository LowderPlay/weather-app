import './style.css'
import {
  AlertTriangle,
  Clock,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  createIcons,
  PlusSquare,
  Search,
  Snowflake,
  Sun,
  Thermometer,
  Wind,
  X
} from 'lucide';
import leaflet, {Marker} from 'leaflet';
import 'leaflet/dist/leaflet.css';

const icons = {
  AlertTriangle,
  PlusSquare,
  Search,
  Sun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  Snowflake,
  CloudRainWind,
  CloudSnow,
  CloudLightning,
  Thermometer,
  Clock,
  Wind,
  X
};

interface WidgetData {
  lat: number;
  lon: number;
  name: string;
}

interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
}

interface GeoResponse {
  results?: GeoResult[];
}

interface CurrentWeather {
  temperature: number;
  windspeed: number;
  weathercode: number;
  time: string;
}

interface WeatherResponse {
  latitude: number;
  longitude: number;
  current_weather: CurrentWeather;
}

type WidgetInput =
  | { type: 'city'; value: string }
  | { type: 'coords'; lat: number; lon: number };

class WeatherApp {
  private cityInput: HTMLInputElement;
  private latInput: HTMLInputElement;
  private lonInput: HTMLInputElement;
  private errorMsg: HTMLElement;
  private errorText: HTMLElement;
  private container: HTMLElement;
  private addBtn: HTMLButtonElement;

  private map?: leaflet.Map;
  private mapMarker?: Marker;
  private widgets: WidgetData[] = JSON.parse(localStorage.getItem('widgets') ?? "[]");

  constructor() {
    this.cityInput = document.getElementById('cityInput') as HTMLInputElement;
    this.latInput = document.getElementById('latInput') as HTMLInputElement;
    this.lonInput = document.getElementById('lonInput') as HTMLInputElement;
    this.errorMsg = document.getElementById('errorMsg') as HTMLElement;
    this.errorText = document.getElementById('errorText') as HTMLElement;
    this.container = document.getElementById('widgetsContainer') as HTMLElement;
    this.addBtn = document.getElementById('addBtn') as HTMLButtonElement;

    if (this.widgets.length === 0 && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.addWidget({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          name: "Ваше местоположение"
        }, true);
      });
    }

    for (const widget of this.widgets) {
      this.addWidget(widget);
    }

    this.initListeners();
    this.initMap();
    createIcons({icons});
  }

  private initMap(): void {
    this.map = leaflet.map('mapSelect', {
      center: [56.85, 60.61],
      zoom: 10,
      attributionControl: false
    });

    leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(this.map);

    this.map.on('click', (e: any) => {
      const {lat, lng} = e.latlng;
      this.updateCoordsInput(lat, lng);
    });
  }

  private updateCoordsInput(lat: number, lng: number): void {
    const latFixed = parseFloat(lat.toFixed(4));
    const lngFixed = parseFloat(lng.toFixed(4));

    this.latInput.value = latFixed.toString();
    this.lonInput.value = lngFixed.toString();
    this.cityInput.value = '';

    if (this.mapMarker) {
      this.mapMarker.setLatLng([lat, lng]);
    } else {
      this.mapMarker = leaflet.marker([lat, lng]).addTo(this.map!);
    }
  }

  private initListeners(): void {
    this.addBtn.addEventListener('click', () => this.handleAddWidgetButton().catch(err => this.handleError(err)));

    this.cityInput.addEventListener('input', () => {
      this.latInput.value = '';
      this.lonInput.value = '';
      if (this.mapMarker) {
        this.map?.removeLayer(this.mapMarker);
        this.mapMarker = undefined;
      }
    });
  }

  private validateInputs(city: string, lat: string, lon: string): WidgetInput {
    if (city.trim()) {
      return {type: 'city', value: city.trim()};
    }

    if (lat && lon) {
      return {type: 'coords', lat: parseFloat(lat), lon: parseFloat(lon)};
    }

    throw new Error("Введите город или координаты или выберите точку на карте");
  }

  private async fetchGeoData(city: string): Promise<GeoResult> {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Не удалось определить местоположение');

    const data: GeoResponse = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error("Местоположение не найдено");
    }
    return data.results[0];
  }

  private async fetchWeatherData(lat: number, lon: number): Promise<WeatherResponse> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&windspeed_unit=ms&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Не удалось обновить данные');
    return await response.json();
  }

  private getLucideIconName(code: number): string {
    if (code === 0) return 'sun'; // Ясно
    if (code >= 1 && code <= 3) return 'cloud'; // Облачно
    if (code >= 45 && code <= 48) return 'cloud-fog'; // Туман
    if (code >= 51 && code <= 55) return 'cloud-drizzle'; // Морось
    if (code >= 56 && code <= 67) return 'cloud-rain'; // Дождь
    if (code >= 71 && code <= 77) return 'snowflake'; // Снег
    if (code >= 80 && code <= 82) return 'cloud-rain-wind'; // Ливень
    if (code >= 85 && code <= 86) return 'cloud-snow'; // Снегопад
    if (code >= 95) return 'cloud-lightning'; // Гроза
    return 'thermometer';
  }

  private renderWidget(data: WeatherResponse, locationName: string): void {
    const {temperature, windspeed, weathercode, time} = data.current_weather;
    const iconName = this.getLucideIconName(weathercode);
    const timeStr = new Date(time).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});

    const div = document.createElement('div');

    div.className = `
            relative bg-zinc-900 border border-zinc-800 p-5 
            hover:border-emerald-500 transition-colors group
        `;

    div.innerHTML = `
            <div class="flex justify-between items-start mb-6">
                <div class="min-w-0 pr-1">
                    <h2 class="text-lg font-bold text-zinc-200 uppercase tracking-wider truncate" title="${locationName}">
                        ${locationName}
                    </h2>
                    <div class="flex items-center gap-2 text-xs text-zinc-600 mt-1">
                        <i data-lucide="clock" class="w-3 h-3"></i>
                        <span>${timeStr}</span>
                    </div>
                </div>
                <div class="text-zinc-400 group-hover:text-emerald-400 transition-colors">
                    <i data-lucide="${iconName}" class="w-10 h-10"></i>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-px bg-zinc-800 border border-zinc-800">
                <div class="bg-zinc-900 p-3 flex flex-col justify-center items-center">
                    <span class="text-[10px] uppercase text-zinc-600 mb-1">Температура</span>
                    <div class="flex items-center gap-1">
                        <i data-lucide="thermometer" class="w-4 h-4 text-zinc-500"></i>
                        <span class="text-2xl font-bold text-zinc-100">${temperature}°</span>
                    </div>
                </div>
                <div class="bg-zinc-900 p-3 flex flex-col justify-center items-center">
                    <span class="text-[10px] uppercase text-zinc-600 mb-1">Ветер (м/с)</span>
                    <div class="flex items-center gap-1">
                        <i data-lucide="wind" class="w-4 h-4 text-zinc-500"></i>
                        <span class="text-xl font-bold text-zinc-300">${windspeed}</span>
                    </div>
                </div>
            </div>
        `;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'absolute -top-2 -right-2 bg-zinc-950 text-zinc-600 border border-zinc-800 p-1 hover:text-red-500 hover:border-red-500 transition-colors z-10';
    closeBtn.innerHTML = '<i data-lucide="x" class="w-4 h-4"></i>';
    closeBtn.onclick = () => {
      this.widgets.splice(this.widgets.findIndex(widget => widget.name === locationName), 1);
      this.saveWidgets();
      div.remove();
    }

    div.appendChild(closeBtn);

    this.container.append(div);

    createIcons({icons});
  }

  private async addWidget(widget: WidgetData, save = false): Promise<void> {
    if (save) {
      this.widgets.push(widget);
      this.saveWidgets();
    }
    const weather = await this.fetchWeatherData(widget.lat, widget.lon);
    this.renderWidget(weather, widget.name);
  }

  private saveWidgets() {
    localStorage.setItem('widgets', JSON.stringify(this.widgets));
  }

  private handleError(err: any) {
    if (err instanceof Error) {
      this.errorText.innerText = err.message;
    } else {
      this.errorText.innerText = 'Неизвестная ошибка';
    }
    this.errorMsg.classList.remove('hidden');
    this.errorMsg.classList.add('animate-shake');
    setTimeout(() => this.errorMsg.classList.remove('animate-shake'), 2000);
  }

  private async handleAddWidgetButton(): Promise<void> {
    const inputData = this.validateInputs(
      this.cityInput.value,
      this.latInput.value,
      this.lonInput.value
    );

    const originalBtnText = this.addBtn.innerHTML;
    this.addBtn.innerHTML = '<span class="animate-pulse">Обработка...</span>';
    this.addBtn.disabled = true;

    try {
      let widget: WidgetData;

      if (inputData.type === 'city') {
        const geo = await this.fetchGeoData(inputData.value);
        widget = {
          lat: geo.latitude,
          lon: geo.longitude,
          name: geo.name
        };
        this.map?.setView([widget.lat, widget.lon], 10);
        if (this.mapMarker) {
          this.mapMarker.setLatLng([widget.lat, widget.lon]);
        } else {
          this.mapMarker = leaflet.marker([widget.lat, widget.lon]).addTo(this.map!);
        }
      } else {
        widget = {
          lat: inputData.lat,
          lon: inputData.lon,
          name: `${inputData.lat.toFixed(2)} | ${inputData.lon.toFixed(2)}`
        };
      }

      await this.addWidget(widget, true);

      this.cityInput.value = '';
      this.latInput.value = '';
      this.lonInput.value = '';
      this.errorMsg.classList.add('hidden');
    } finally {
      this.addBtn.innerHTML = originalBtnText;
      this.addBtn.disabled = false;
      createIcons({icons});
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WeatherApp();
});
