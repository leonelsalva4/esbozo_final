export interface Sketch {
  id: string;
  title: string;
  series: string;
  author: string;
  date_documented: string;
  technique: string;
  dimensions_cm: string;
  provenance: string;
  asset_id: string;
  lot_count?: number;
}
