// constants.js - Cấu hình thông số Hardcore Survival 30 Rounds (60s/Round) & Cơ chế Đạn Dược

const GAME_CONFIG = {
    totalRounds: 30,
    roundDuration: 60, // Mỗi round kéo dài đúng 60 giây
    maxWorkers: 15,
    baseMaxHp: 1000
};

// Chi phí tài nguyên xây dựng & chiêu mộ
const COSTS = {
    villager: 20,    // 20 Gỗ / Dân làng
    soldier: 25,     // 25 Gỗ / Chiến binh Huscarl
    repair: 15,      // 15 Gỗ / Sửa chữa Đại Sảnh (+150 HP) & toàn bộ Tường
    wallWood: 12,    // 12 Gỗ
    wallStone: 25,   // 25 Đá
    towerWood: 25,   // 25 Gỗ
    towerStone: 45,  // 45 Đá
    towerIron: 65,   // 65 Sắt
    towerSteel: 90   // 90 Thép
};

// Cơ chế Phương án 1: Số phát bắn nạp được cho mỗi 1 đơn vị tài nguyên tương ứng
const AMMO_PER_RESOURCE = {
    wood: 6,   // 1 Gỗ  = 6 phát bắn Chòi Cung Gỗ
    stone: 5,  // 1 Đá  = 5 phát bắn Đại Nỏ Đá
    iron: 4,   // 1 Sắt = 4 phát bắn Hỏa Pháo Sắt
    steel: 3   // 1 Thép = 3 phát bắn Tháp Sấm Sét Thor
};

// Thông số chi tiết các loại Trụ phòng thủ
const TOWER_STATS = {
    wood:  { range: 145, damage: 20, maxCooldown: 50, bulletSpeed: 4.8, splash: false, splashRadius: 0 },
    stone: { range: 195, damage: 56, maxCooldown: 62, bulletSpeed: 5.5, splash: false, splashRadius: 0 },
    iron:  { range: 165, damage: 45, maxCooldown: 38, bulletSpeed: 5.2, splash: true,  splashRadius: 62 },
    steel: { range: 220, damage: 100, maxCooldown: 28, bulletSpeed: 7.0, splash: true, splashRadius: 76 }
};

// Thông số khai thác của Dân làng trong 60 giây (Cân chỉnh để vừa đủ nuôi đạn Trụ + Xây dựng)
const MINING_CONFIG = {
    walkSpeed: 0.80,
    workFrames: {
        wood: 175,   // ~2.9 giây chặt gỗ
        stone: 205,  // ~3.4 giây đục đá
        iron: 235,   // ~3.9 giây đào sắt
        steel: 260   // ~4.3 giây rèn thép
    },
    yieldPerTrip: {
        wood: 5,     // +5 Gỗ / chuyến (Bù tiêu hao đạn Trụ Gỗ)
        stone: 4,    // +4 Đá / chuyến (Bù tiêu hao đạn Trụ Đá)
        iron: 3,     // +3 Sắt / chuyến (Bù tiêu hao đạn Trụ Sắt)
        steel: 2     // +2 Thép / chuyến (Bù tiêu hao đạn Trụ Thép)
    }
};
