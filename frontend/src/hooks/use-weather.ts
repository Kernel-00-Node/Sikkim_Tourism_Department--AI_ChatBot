/**
 * useWeather — fetches live conditions from Open-Meteo (free, no API key).
 *
 * Results are cached in a module-level Map so every destination card on the
 * page shares a single in-flight request per unique (lat, lon) pair.
 */
import { useState, useEffect } from "react";

export interface WeatherData {
    tempC: number;
    condition: string;
    emoji: string;
    windspeedKmh: number;
    humidity: number;
}

// Module-level cache — persists for the lifetime of the page.
const _cache = new Map<string, WeatherData>();
const _pending = new Map<string, Promise<WeatherData>>();

/** Translate a WMO weather interpretation code into a human label + emoji. */
function wmoToCondition(code: number): { condition: string; emoji: string } {
    if (code === 0)                          return { condition: "Clear sky",      emoji: "☀️"  };
    if (code === 1)                          return { condition: "Mainly clear",   emoji: "🌤️" };
    if (code === 2)                          return { condition: "Partly cloudy",  emoji: "⛅"  };
    if (code === 3)                          return { condition: "Overcast",       emoji: "☁️"  };
    if (code === 45 || code === 48)          return { condition: "Foggy",          emoji: "🌫️" };
    if ([51, 53, 55].includes(code))         return { condition: "Drizzle",        emoji: "🌦️" };
    if ([61, 63, 65].includes(code))         return { condition: "Rain",           emoji: "🌧️" };
    if ([71, 73, 75, 77].includes(code))     return { condition: "Snowfall",       emoji: "🌨️" };
    if ([80, 81, 82].includes(code))         return { condition: "Rain showers",   emoji: "🌦️" };
    if (code === 85 || code === 86)          return { condition: "Snow showers",   emoji: "🌨️" };
    if (code === 95)                         return { condition: "Thunderstorm",   emoji: "⛈️" };
    if (code === 96 || code === 99)          return { condition: "Thunderstorm",   emoji: "⛈️" };
    return { condition: "—", emoji: "🌡️" };
}

async function _fetch(lat: number, lon: number): Promise<WeatherData> {
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;

    if (_cache.has(key)) return _cache.get(key)!;

    if (!_pending.has(key)) {
        const promise = (async (): Promise<WeatherData> => {
            const url =
                `https://api.open-meteo.com/v1/forecast` +
                `?latitude=${lat}&longitude=${lon}` +
                `&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m` +
                `&timezone=Asia%2FKolkata`;

            const res = await fetch(url);
            if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
            const json = await res.json();
            const cur = json.current;
            const { condition, emoji } = wmoToCondition(cur.weathercode);
            const data: WeatherData = {
                tempC: Math.round(cur.temperature_2m),
                condition,
                emoji,
                windspeedKmh: Math.round(cur.windspeed_10m),
                humidity: Math.round(cur.relative_humidity_2m),
            };
            _cache.set(key, data);
            return data;
        })();

        _pending.set(key, promise);
    }

    const pending = _pending.get(key)!;
    // A transient network failure must not poison this location forever.
    // Successful responses remain available through _cache.
    pending.catch(() => {}).finally(() => {
        if (_pending.get(key) === pending) _pending.delete(key);
    });
    return pending;
}

/**
 * @param lat  Decimal latitude  (null/undefined → hook is a no-op)
 * @param lon  Decimal longitude (null/undefined → hook is a no-op)
 */
export function useWeather(
    lat: number | null | undefined,
    lon: number | null | undefined,
) {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState(false);

    useEffect(() => {
        if (lat == null || lon == null) {
            setWeather(null);
            setLoading(false);
            setError(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(false);
        _fetch(lat, lon)
            .then((d) => { if (!cancelled) setWeather(d); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [lat, lon]);

    return { weather, loading, error };
}
