import {
  Bicycle,
  Bus,
  Car,
  CarProfile,
  type Icon,
  Jeep,
  Motorcycle,
  Tractor,
  Truck,
  TruckTrailer,
  Van,
} from '@phosphor-icons/react';
import type { VehicleIcon as IconKey } from '../types';

const ICONS: Record<IconKey, Icon> = {
  motor: Motorcycle,
  mobil: Car,
  sedan: CarProfile,
  jip: Jeep,
  van: Van,
  bus: Bus,
  truk: Truck,
  trailer: TruckTrailer,
  traktor: Tractor,
  sepeda: Bicycle,
};

/** Logo kendaraan (siluet penuh, warna mengikuti teks tombol). */
export function VehicleIcon({ icon, className }: { icon?: IconKey; className?: string }) {
  if (!icon) return null;
  const Glyph = ICONS[icon];
  return <Glyph weight="fill" className={className} aria-hidden="true" />;
}
