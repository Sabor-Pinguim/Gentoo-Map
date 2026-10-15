import defaultMapData from '../../rfid-nfc-apresentacao.cmap.json';
import { type MapDoc } from './types';

/**
 * Mapa Conceitual Completo Padrão: RFID e NFC
 * Carrega diretamente o arquivo rfid-nfc-apresentacao.cmap.json da raiz do projeto.
 */
export function createRfidPresentationMap(): MapDoc {
  return JSON.parse(JSON.stringify(defaultMapData)) as MapDoc;
}
