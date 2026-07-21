ChatBot/
│
├── 📄 README.md
│
├── 📁 backend/
│   ├── 📄 main.py
│   ├── 📄 requirements.txt
│   ├── 📄 .env
│   ├── 📄 .env.example
│   ├── 📄 list_models.py
│   │
│   └── 📁 app/
│       ├── 📄 __init__.py
│       ├── 📄 config.py
│       │
│       ├── 📁 models/
│       │   ├── 📄 __init__.py
│       │   └── 📄 schemas.py
│       │
│       ├── 📁 database/
│       │   ├── 📄 __init__.py
│       │   ├── 📄 base.py
│       │   ├── 📄 factory.py
│       │   ├── 📄 mock_data.py
│       │   ├── 📄 mock_repo.py
│       │   └── 📄 mysql_repo.py
│       │
│       ├── 📁 routers/
│       │   ├── 📄 __init__.py
│       │   ├── 📄 chat.py
│       │   └── 📄 destinations.py
│       │
│       └── 📁 services/
│           ├── 📄 __init__.py
│           ├── 📄 rag_chain.py
│           └── 📄 vectorstore.py
│
├── 📁 docs/
│   └── 📄 schema.sql
│
└── 📁 frontend/
├── 📄 index.html
├── 📄 package.json
├── 📄 package-lock.json
├── 📄 tsconfig.json
├── 📄 vite.config.ts
│
├── 📁 public/
│   ├── 📄 favicon.svg
│   └── 📁 images/
│       ├── 🖼️ Gangtok.png
│       ├── 🖼️ Gurudongmar_Lake.jpeg
│       ├── 🖼️ L_Z.jpeg
│       ├── 🖼️ Namchi.jpeg
│       ├── 🖼️ Nathula_Pass.jpeg
│       ├── 🖼️ Pelling.jpeg
│       ├── 🖼️ Ravangla.jpeg
│       ├── 🖼️ Tsomgo_Lake.jpeg
│       ├── 🖼️ Yuksom.jpeg
│       └── 🖼️ Yumthang_Valley.jpeg
│
└── 📁 src/
├── 📄 main.tsx
├── 📄 App.tsx
├── 📄 index.css
│
├── 📁 lib/
│   ├── 📄 api.ts
│   └── 📄 utils.ts
│
├── 📁 hooks/
│   ├── 📄 use-mobile.tsx
│   └── 📄 use-toast.ts
│
├── 📁 pages/
│   ├── 📄 home.tsx
│   ├── 📄 destinations.tsx
│   └── 📄 not-found.tsx
│
├── 📁 components/
│   ├── 📄 chat.tsx
│   ├── 📄 destination-card.tsx
│   ├── 📄 destination-details-dialog.tsx
│   ├── 📄 layout.tsx
│   └── 📁 ui/
│       ├── 📄 button.tsx
│       ├── 📄 card.tsx
│       ├── 📄 dialog.tsx
│       ├── 📄 input.tsx
│       ├── 📄 badge.tsx
│       ├── 📄 scroll-area.tsx
│       ├── 📄 skeleton.tsx
│       ├── 📄 spinner.tsx
│       ├── 📄 toast.tsx
│       ├── 📄 toaster.tsx
│       └── 📄 ... (30+ more UI primitives)
