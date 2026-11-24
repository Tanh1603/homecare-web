export interface ProvinceOption {
  code: string;
  name: string;
}

/**
 * Official 34 provinces/cities synced with
 * homecare-api/services/household-service/src/main/resources/data/administrative-units/locations.json
 */
export const VIETNAM_PROVINCES: ProvinceOption[] = [
  { code: "79", name: "Thành phố Hồ Chí Minh" },
  { code: "01", name: "Thành phố Hà Nội" },
  { code: "48", name: "Thành phố Đà Nẵng" },
  { code: "31", name: "Thành phố Hải Phòng" },
  { code: "92", name: "Thành phố Cần Thơ" },
  { code: "46", name: "Thành phố Huế" },
  { code: "22", name: "Thành phố Quảng Ninh" },
  { code: "24", name: "Thành phố Bắc Ninh" },
  { code: "75", name: "Thành phố Đồng Nai" },
  { code: "91", name: "Tỉnh An Giang" },
  { code: "96", name: "Tỉnh Cà Mau" },
  { code: "04", name: "Tỉnh Cao Bằng" },
  { code: "66", name: "Tỉnh Đắk Lắk" },
  { code: "11", name: "Tỉnh Điện Biên" },
  { code: "82", name: "Tỉnh Đồng Tháp" },
  { code: "52", name: "Tỉnh Gia Lai" },
  { code: "42", name: "Tỉnh Hà Tĩnh" },
  { code: "33", name: "Tỉnh Hưng Yên" },
  { code: "56", name: "Tỉnh Khánh Hòa" },
  { code: "12", name: "Tỉnh Lai Châu" },
  { code: "68", name: "Tỉnh Lâm Đồng" },
  { code: "20", name: "Tỉnh Lạng Sơn" },
  { code: "15", name: "Tỉnh Lào Cai" },
  { code: "40", name: "Tỉnh Nghệ An" },
  { code: "37", name: "Tỉnh Ninh Bình" },
  { code: "25", name: "Tỉnh Phú Thọ" },
  { code: "51", name: "Tỉnh Quảng Ngãi" },
  { code: "44", name: "Tỉnh Quảng Trị" },
  { code: "14", name: "Tỉnh Sơn La" },
  { code: "80", name: "Tỉnh Tây Ninh" },
  { code: "19", name: "Tỉnh Thái Nguyên" },
  { code: "38", name: "Tỉnh Thanh Hóa" },
  { code: "08", name: "Tỉnh Tuyên Quang" },
  { code: "86", name: "Tỉnh Vĩnh Long" },
];
