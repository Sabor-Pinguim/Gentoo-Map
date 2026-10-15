import defaultMapData from './defaultPresentationMap.json';
import { type MapDoc } from './types';

/**
 * Mapa Conceitual Completo Padrão: RFID e NFC
 * Versão atualizada de 50 conceitos com posições, descrições, falas e notas refinadas.
 */
export function createRfidPresentationMap(): MapDoc {
  return JSON.parse(JSON.stringify(defaultMapData)) as MapDoc;
}
