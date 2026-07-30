"""
Seeded in-memory Sikkim destination data used by MockRepository.
Replace / extend freely — this is the single source of truth for mock mode.
"""
from app.models.schemas import Destination

DESTINATIONS: list[Destination] = [
    Destination(
        id=1,
        name="Gangtok",
        slug="gangtok",
        category="culture",
        description=(
            "The capital of Sikkim, Gangtok sits at 1,650 m and blends Tibetan Buddhist culture "
            "with modern hill-town life. The MG Marg pedestrian promenade, the Rumtek Monastery, "
            "and panoramic Kanchenjunga views make it the gateway to everything Sikkim has to offer."
        ),
        location="East Sikkim",
        district="East Sikkim",
        altitude="1,650 m (5,410 ft)",
        best_time="March–May, October–December",
        entry_fee=None,
        permit_required=False,
        how_to_reach=(
            "Nearest airport: Pakyong Airport (30 km). Nearest major airport: Bagdogra, West Bengal (124 km). "
            "Regular shared jeeps and private taxis from Siliguri/NJP. SNT buses from Siliguri."
        ),
        highlights=[
            "MG Marg pedestrian zone",
            "Rumtek Monastery",
            "Enchey Monastery",
            "Namgyal Institute of Tibetology",
            "Tashi Viewpoint – Kanchenjunga panorama",
            "Ropeway to Deorali",
        ],
        tags=["capital", "monastery", "culture", "shopping", "viewpoint", "ropeway"],
        image_placeholder="#4a7c59",
        image_url="/images/Gangtok.png",
        latitude=27.3314,
        longitude=88.6138,
    ),
    Destination(
        id=2,
        name="Nathu La Pass",
        slug="nathu-la",
        category="adventure",
        description=(
            "At 4,310 m on the ancient Silk Road, Nathu La is one of the three open trading border "
            "posts between India and China. The pass offers stunning high-altitude terrain and "
            "is guarded by the Indian Army."
        ),
        location="55 km east of Gangtok",
        district="East Sikkim",
        altitude="4,310 m (14,140 ft)",
        best_time="May–October (closed in winter due to snowfall)",
        entry_fee="₹200 per person (Indian nationals); ₹1,000 (foreign nationals)",
        permit_required=True,
        permit_info=(
            "Protected Area Permit (PAP) required for foreign nationals. "
            "Indian nationals need an Inner Line Permit (ILP) obtainable from Gangtok tourism offices. "
            "Maximum 800 Indian + 50 foreign tourists per day. Advance booking recommended."
        ),
        how_to_reach=(
            "From Gangtok via Tsomgo Lake — a 3-hour drive (55 km). "
            "Only private/hired vehicles allowed beyond Tsomgo Lake. No public transport."
        ),
        highlights=[
            "India–China trade post",
            "Snow-clad peaks year-round",
            "Border ceremony viewing point",
            "High-altitude glacial terrain",
        ],
        tags=["border", "high-altitude", "silk-road", "snow", "permit", "adventure"],
        image_placeholder="#5b6d8a",
        image_url="/images/Nathula_Pass.jpeg",
        latitude=27.3856,
        longitude=88.8232,
    ),
    Destination(
        id=3,
        name="Tsomgo Lake (Changu Lake)",
        slug="tsomgo-lake",
        category="nature",
        description=(
            "A sacred oval glacial lake at 3,780 m, Tsomgo (meaning 'source of water') freezes "
            "completely in winter and blooms with rhododendrons in spring. Revered by both Hindus "
            "and Buddhists, it is one of the highest lakes in India accessible by road."
        ),
        location="40 km east of Gangtok",
        district="East Sikkim",
        altitude="3,780 m (12,400 ft)",
        best_time="March–May (rhododendrons), October–December (snow)",
        entry_fee="₹100 per person",
        permit_required=True,
        permit_info=(
            "Inner Line Permit (ILP) for Indian nationals. "
            "Foreign nationals require a Protected Area Permit and must visit in groups of 2+."
        ),
        how_to_reach=(
            "40 km from Gangtok via NH10. Shared jeeps (₹150–200) depart from "
            "Sikkim Nationalised Transport (SNT) stand, Gangtok, from 7 am."
        ),
        highlights=[
            "Glacial lake freezing in winter",
            "Rhododendron bloom in spring",
            "Yak rides on the lake shore",
            "Brahminy ducks and red pandas in the area",
        ],
        tags=["lake", "glacial", "sacred", "wildlife", "rhododendron", "snow", "permit"],
        image_placeholder="#2e6fa3",
        image_url="/images/Tsomgo_Lake.jpeg",
        latitude=27.3734,
        longitude=88.7694,
    ),
    Destination(
        id=4,
        name="Yumthang Valley",
        slug="yumthang-valley",
        category="nature",
        description=(
            "Called the 'Valley of Flowers of Sikkim', Yumthang at 3,564 m bursts into a carpet of "
            "rhododendrons (over 24 species), primulas, and poppies from March to May. "
            "The Yumthang River and hot springs add to the drama of this high Himalayan valley."
        ),
        location="148 km north of Gangtok",
        district="North Sikkim",
        altitude="3,564 m (11,693 ft)",
        best_time="March–June (flowers), December–February (snow)",
        entry_fee="₹100 per person",
        permit_required=True,
        permit_info=(
            "Restricted Area Permit (RAP) for Indian nationals from District Collector's office, Gangtok. "
            "Foreign nationals not allowed beyond Lachung without special permission."
        ),
        how_to_reach=(
            "Drive from Gangtok to Lachung (5–6 hrs, 117 km), then Lachung to Yumthang (1 hr, 25 km). "
            "Shared jeeps/tourist packages available from Gangtok."
        ),
        highlights=[
            "24+ rhododendron species in bloom",
            "Shingba Rhododendron Sanctuary",
            "Natural hot springs (sulphur)",
            "Zero Point day trip (4,428 m)",
        ],
        tags=["valley", "flowers", "rhododendron", "hot-springs", "north-sikkim", "permit"],
        image_placeholder="#7d5a9a",
        image_url="/images/Yumthang_Valley.jpeg",
        latitude=27.8253,
        longitude=88.6842,
    ),
    Destination(
        id=5,
        name="Pelling",
        slug="pelling",
        category="nature",
        description=(
            "West Sikkim's most popular viewpoint town, Pelling offers arguably the clearest "
            "ground-level view of Kanchenjunga (8,586 m), the world's third-highest peak. "
            "The Pemayangtse Monastery, Rabdentse Ruins, and Khecheopalri Lake are all within day-trip distance."
        ),
        location="West Sikkim",
        district="West Sikkim",
        altitude="2,150 m (7,050 ft)",
        best_time="October–May",
        entry_fee=None,
        permit_required=False,
        how_to_reach=(
            "From Gangtok: 130 km, ~4 hrs by shared jeep or taxi. "
            "From Siliguri (NJP): ~5 hrs, 160 km."
        ),
        highlights=[
            "Kanchenjunga sunrise view",
            "Pemayangtse Monastery (300-year-old)",
            "Rabdentse Ruins – former Sikkimese capital",
            "Khecheopalri (Wish-Fulfilling) Lake",
            "Singshore Bridge – highest suspension bridge in the region",
        ],
        tags=["viewpoint", "kanchenjunga", "monastery", "ruins", "west-sikkim", "bridge"],
        image_placeholder="#8b5e3c",
        image_url="/images/Pelling.jpeg",
        latitude=27.2990,
        longitude=88.2604,
    ),
    Destination(
        id=6,
        name="Yuksom",
        slug="yuksom",
        category="culture",
        description=(
            "The first capital of Sikkim (1642), Yuksom is a sacred historical town and the starting "
            "point for the famous Goechala trek to the base of Kanchenjunga. The Norbugang Chorten "
            "and Dubdi Monastery (oldest in Sikkim) make this a pilgrimage and trekking hub."
        ),
        location="West Sikkim",
        district="West Sikkim",
        altitude="1,780 m (5,840 ft)",
        best_time="March–May, October–November",
        entry_fee=None,
        permit_required=True,
        permit_info=(
            "Khangchendzonga National Park permit required for Goechala trek. "
            "₹200/day for Indian nationals, ₹1,000/day for foreign nationals."
        ),
        how_to_reach=(
            "From Pelling: ~40 km, 1.5 hrs. From Gangtok: ~160 km, 5 hrs. "
            "Shared jeeps from Pelling and Jorethang."
        ),
        highlights=[
            "Norbugang Chorten – first coronation site of Sikkim",
            "Dubdi Monastery (1701) – oldest in Sikkim",
            "Goechala Trek basecamp",
            "Khangchendzonga National Park entrance",
            "Kathok Lake",
        ],
        tags=["history", "first-capital", "trek", "goechala", "monastery", "west-sikkim", "permit"],
        image_placeholder="#3d6b4f",
        image_url="/images/Yuksom.jpeg",
        latitude=27.4350,
        longitude=88.3370,
    ),
    Destination(
        id=7,
        name="Ravangla",
        slug="ravangla",
        category="pilgrimage",
        description=(
            "A quiet hill town in South Sikkim at 2,100 m, Ravangla is home to the magnificent "
            "Buddha Park (Tathagata Tsal) with its 130-ft statue of Shakyamuni Buddha. "
            "Maenam Wildlife Sanctuary and panoramic Himalayan views add to the appeal."
        ),
        location="South Sikkim",
        district="South Sikkim",
        altitude="2,100 m (6,900 ft)",
        best_time="October–May",
        entry_fee="₹50 for Buddha Park",
        permit_required=False,
        how_to_reach=(
            "From Gangtok: 65 km, ~2.5 hrs. From Namchi: 30 km, 1 hr. "
            "Regular shared jeeps from Gangtok and Namchi."
        ),
        highlights=[
            "Buddha Park – 130 ft Shakyamuni Buddha statue",
            "Maenam Wildlife Sanctuary",
            "Ralong Monastery",
            "Sunrise Himalayan views",
        ],
        tags=["buddhism", "buddha-statue", "south-sikkim", "wildlife", "monastery", "pilgrimage"],
        image_placeholder="#c4813a",
        image_url="/images/Ravangla.jpeg",
        latitude=27.3040,
        longitude=88.3615,
    ),
    Destination(
        id=8,
        name="Gurudongmar Lake",
        slug="gurudongmar-lake",
        category="pilgrimage",
        description=(
            "One of the highest lakes in the world at 5,183 m, Gurudongmar is sacred to both "
            "Sikhs and Buddhists. Named after Guru Padmasambhava and Guru Nanak, a portion of the "
            "lake is said to never freeze. The stark, otherworldly landscape is breathtaking."
        ),
        location="North Sikkim",
        district="North Sikkim",
        altitude="5,183 m (17,000 ft)",
        best_time="May–October",
        entry_fee="₹100 per person",
        permit_required=True,
        permit_info=(
            "Restricted Area Permit (RAP) required. Obtainable via registered tour operators or "
            "District Collector's office, Mangan. Foreign nationals NOT permitted."
        ),
        how_to_reach=(
            "From Gangtok: via Lachen (126 km, 6 hrs), then Gurudongmar (70 km, 3 hrs). "
            "Only 4×4 vehicles permitted. Usually done as part of North Sikkim package tour."
        ),
        highlights=[
            "One of world's highest lakes",
            "Sacred to Sikhs and Buddhists",
            "Breathtaking alpine desert landscape",
            "Stunning views of Himalayan ranges",
        ],
        tags=["lake", "high-altitude", "sacred", "sikh", "north-sikkim", "permit", "pilgrimage"],
        image_placeholder="#4a6fa5",
        image_url="/images/Gurudongmar_Lake.jpeg",
        latitude=27.7163,
        longitude=88.7274,
    ),
    Destination(
        id=9,
        name="Namchi",
        slug="namchi",
        category="pilgrimage",
        description=(
            "South Sikkim's district headquarters at 1,675 m, Namchi is famous for the Samdruptse "
            "Hill with its 108-ft statue of Guru Padmasambhava, and Siddhesvara Dham — a replica "
            "of the 12 Jyotirlingas and 4 Dhams in one complex."
        ),
        location="South Sikkim",
        district="South Sikkim",
        altitude="1,675 m (5,495 ft)",
        best_time="October–May",
        entry_fee="₹20 for Samdruptse Hill",
        permit_required=False,
        how_to_reach=(
            "From Gangtok: 80 km, ~3 hrs. From Siliguri: ~100 km, ~4 hrs. "
            "Regular SNT buses and shared jeeps."
        ),
        highlights=[
            "Samdruptse – 108 ft Guru Rinpoche statue",
            "Siddhesvara Dham – replica of 12 Jyotirlingas",
            "Rock Garden",
            "Ngadak Monastery",
        ],
        tags=["pilgrimage", "guru-rinpoche", "south-sikkim", "statue", "hinduism", "buddhism"],
        image_placeholder="#9c5b5b",
        image_url="/images/Namchi.jpeg",
        latitude=27.1672,
        longitude=88.3595,
    ),
    Destination(
        id=10,
        name="Lachung & Zero Point",
        slug="lachung-zero-point",
        category="adventure",
        description=(
            "Lachung is a scenic village in North Sikkim at 2,900 m, gateway to both Yumthang "
            "Valley and Zero Point (4,428 m) — the last motorable point in North Sikkim, perennially "
            "covered in snow and offering a raw Himalayan wilderness experience."
        ),
        location="North Sikkim",
        district="North Sikkim",
        altitude="2,900 m (Lachung) / 4,428 m (Zero Point)",
        best_time="May–October",
        entry_fee="₹150 per person (Zero Point)",
        permit_required=True,
        permit_info=(
            "Restricted Area Permit required for all visitors. "
            "Foreign nationals not allowed beyond Lachung."
        ),
        how_to_reach=(
            "From Gangtok: 117 km, 5–6 hrs. Shared tourist jeeps and packages available. "
            "No solo driving — guide/package mandatory."
        ),
        highlights=[
            "Zero Point – permanent snow at 4,428 m",
            "Glacial streams and frozen waterfalls",
            "Yumthang day trip from Lachung",
            "Traditional Lepcha/Bhutia village culture",
        ],
        tags=["snow", "zero-point", "north-sikkim", "glacier", "adventure", "permit"],
        image_placeholder="#5b8da8",
        image_url="/images/L_Z.jpeg",
        latitude=27.6868,
        longitude=88.7463,
    ),
]
