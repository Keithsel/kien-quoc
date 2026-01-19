/**
 * Tile background images configuration
 * Maps cell IDs to background image paths
 * Images should be placed in /public/tiles/
 */

// Map cell IDs to their background image paths
export const TILE_BACKGROUNDS: Record<string, string> = {
  'cell-0-0': '/tiles/lang-son.jpg', // Cửa khẩu Lạng Sơn
  'cell-0-1': '/tiles/bach-khoa.jpg', // Đại học Bách khoa
  'cell-0-2': '/tiles/vien-han-lam.jpg', // Viện Hàn lâm
  'cell-0-3': '/tiles/viet-tri.jpg', // Khu CN Việt Trì
  'cell-1-0': '/tiles/song-hong.jpg', // Đồng bằng sông Hồng
  'cell-1-3': '/tiles/da-nang.jpg', // Cảng Đà Nẵng
  'cell-2-0': '/tiles/tay-nguyen.jpg', // Tây Nguyên
  'cell-2-3': '/tiles/tan-thuan.jpg', // KCX Tân Thuận
  'cell-3-0': '/tiles/cuu-long.jpg', // Đồng bằng sông Cửu Long
  'cell-3-1': '/tiles/thu-duc.jpg', // Khu đô thị Thủ Đức
  'cell-3-2': '/tiles/ngoai-thuong.jpg', // Ngân hàng Ngoại thương
  'cell-3-3': '/tiles/sai-gon.jpg' // Cảng Sài Gòn
};

// Helper to check if a cell has a background image
export function getCellBackground(cellId: string): string | undefined {
  return TILE_BACKGROUNDS[cellId];
}
