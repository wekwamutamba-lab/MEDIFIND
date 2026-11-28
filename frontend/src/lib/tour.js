// Starts the welcome tour again (components/Tour.jsx listens for this). Used by
// the "Show me around" button on Help & Support.
export const TOUR_EVENT = 'mf:tour';

export function startTour() {
  window.dispatchEvent(new Event(TOUR_EVENT));
}
