export const cards = [
  { name: "Draft — Spec Rig Ideas", draft: true, listNote: "Not for a job yet: a rig to pitch.", cam: "Sony FX6 · Sony FX9 · NiSi VND", lens: "Sony 24-70mm F2.8 II · Sony 70-200mm F2.8 II · Sony 16-35mm F4" },
  { name: "Đen Vâu – MV “Đi Về Nhà 2”", tag: "MV", dates: "21–23 Oct 26", ph: ["Đen Vâu Team", "Khánh Võ"], rh: ["Cinerent Saigon", "Phát Đỗ"], note: "Artist team handles wardrobe. We handle all camera + lighting.", v: "V5", vnote: "Final, sent to Cinerent", lists: 5, locs: "Đà Lạt – Langbiang · Đà Lạt – night market", cam: "Sony FX3 · NiSi VND · Accsoon CineView SE", lens: "Sony 24-70mm F2.8 II · Sony 35mm F1.4 · Sony 85mm F1.4" },
  { name: "Pepsi Tết 2027 — Big Family Table", tag: "TVC", dates: "2–6, 9–13 Nov 26", ph: ["Ogilvy Films", "Linh Trần"], rh: ["VTS Rental", "Hùng Nguyễn"], note: "Call time 05:30 at the studio gate. Camera truck parks on the left lane only.", v: "V2", vnote: "Budget cut: no anamorphic package", lists: 3, locs: "Studio Kỳ Hòa – Q.10 · Hội An · Đà Nẵng airport", cam: "ARRI 35 · FSND 4×5.65″ · Black Pro-Mist 4×5.65″", lens: "ARRI Signature Primes · DZOFilms Catta Ace" },
  { name: "Samsung Galaxy S27 Ultra — Night Mode", tag: "TVC", dates: "9, 12 Oct 26", ph: ["Mango Films", "Quân Hồ"], rh: ["Cinerent Saigon", "Phát Đỗ"], v: "V2", vnote: "After tech recce: + crane, jib", lists: 2, locs: "Bùi Viện walking street · Studio Phú Mỹ Hưng", cam: "RED Komodo-X · Blue Streak 4×5.65″ · Vaxis Storm", lens: "Cooke Anamorphic/i FF · Laowa Probe zoom set", warn: "No items: D2" },
];
export const list = {
  name: "Pepsi Tết 2027 — Big Family Table", tag: "TVC", dates: "2–6, 9–13 Nov 26",
  ph: ["Ogilvy Films", "Linh Trần"], rh: ["VTS Rental", "Hùng Nguyễn"],
  note: "Call time 05:30 at the studio gate. Camera truck parks on the left lane only — the right side is a fire lane. Client monitor needs its own wireless feed (Teradek or Vaxis).",
  v: "V2", vnote: "Budget cut: no anamorphic package",
  days: [["D1", "2/11", "Prelight"], ["D2", "3/11", "Studio"], ["D3", "4/11", "Studio"], ["D4", "5/11", "Studio"], ["D5", "6/11", "Studio"]],
  depts: [
    { name: "Camera", count: 9, subs: [["Cinema Bodies", [["ARRI 35", "", [2, 2, 2, 2, 2]], ["ARRI Mini LF", "B-cam", [0, 1, 1, 1, 0]]]], ["Monitors", [["SmallHD Cine 7", "", [2, 3, 3, 3, 2]]]]] },
    { name: "Grip", count: 6, subs: [["Dolly / Track", [["Panther", "", [0, 1, 0, 0, 1]], ["Doorway Dolly", "", [2, 2, 1, 0, 0]], ["Dana Dolly / Slider", "4ft rails", [1, 1, 1, 0, 0]]]], ["Crane / Jib", [["Jib Arm", "", [0, 0, 1, 1, 0]]]]] },
  ],
};
