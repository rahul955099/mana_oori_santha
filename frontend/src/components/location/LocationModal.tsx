import { MapPin } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { CurrentLocationButton } from "@/components/location/CurrentLocationButton";
import { LocationSearch } from "@/components/location/LocationSearch";
import { useLocationContext } from "@/context/LocationContext";
import { locationSuggestions, defaultSuggestedCities } from "@/data/locations";

export function LocationModal() {
  const { isModalOpen, closeModal, setManualLocation } = useLocationContext();
  const suggested = locationSuggestions.filter((loc) => defaultSuggestedCities.includes(loc.id));

  return (
    <Modal isOpen={isModalOpen} onClose={closeModal} title="Choose your delivery location">
      <div className="space-y-4">
        <CurrentLocationButton />
        <LocationSearch onSelect={setManualLocation} />

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Suggested locations</p>
          <div className="flex flex-wrap gap-2">
            {suggested.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => setManualLocation(loc)}
                className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-600 transition hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
              >
                <MapPin size={12} /> {loc.city}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
