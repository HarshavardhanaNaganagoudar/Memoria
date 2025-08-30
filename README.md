# Memoria — Local Alzheimer’s Memory Companion

A fully local-only, privacy-first app that helps people living with Alzheimer’s (and their families) log memories, practice gentle recall, and track progress over time with a calm Zen stones metaphor — powered by an on-device GPT-OSS:20B model.

> “Because every memory matters.”

---

## ✨ Features

- 🧠 **Local-only AI** – Runs entirely on-device using **GPT-OSS:20B**, with optional fallback for reliability. Handles question generation, answer checking, and supportive feedback.

- 📝 **Memory Logging** – Capture life’s moments with entries that include 📸 photos, 🧍 names, 📅 events, 📍 places, and 🗒️ notes.

- 🎯 **Personalized Tests** – Generates 3–5 short questions based on your own journal entries for meaningful, memory-based reflection.

- 🪨 **Zen Stones Progress** – Each correct answer stacks a calming stone. Build towers as a gentle, visual signal of progress.

- 💬 **AI Feedback** – Receive warm, actionable tips tailored for both users and caregivers to foster growth and emotional support.

- 🚨 **Safety Alerts** – If your recent average score drops below **50%**, the system offers to notify a trusted contact for timely help.

- 📴 **Offline-first Design** – Works seamlessly without internet. All data is stored locally for privacy, speed, and peace of mind.

---

## 🛠️ Tech Stack

**Frontend (UI Layer)**  
- ⚛️ **React (Vite)** — Lightweight, fast, local-first interface  
- 🎨 **Tailwind CSS** — Clean, responsive design system  
- 📱 **PWA-ready** — Installable, mobile-friendly app experience  

**Backend / Core Engine**  
- 🟢 **Node.js + Express** — Local backend logic, API routes, and middleware  
- 🗃️ **SQLite (memories.db)** — Local-only database for storing entries, test results, and progress  
- 📦 **Sequelize/Custom Models** — Memory schema & ORM-style access (via `backend/models/memory.js`)  
- 🧩 **Custom Logic** — Memory logging, test generation, scoring, and caregiver alerts  

**AI & Processing**  
- 🤖 **GPT-OSS:20B (via Ollama runtime)** — Local LLM powering question generation, scoring, and AI feedback  
- 🔄 **Backend Integration** — LLM runs through Node.js API calls, keeping all computation offline  

**Media & Design**  
- 🗣️ **ElevenLabs** — AI narration for demo and accessibility (not runtime app dependency)  
- 🖼️ **Figma** — Design mockups and UI prototyping  
- 🪨 **Zen Stones Visualization** — Unique UX metaphor for tracking progress and stability  

> 🔐 **Privacy-first design**: Everything — storage, logic, and AI — runs fully **on-device**. No external API calls. No cloud storage.  


---
## 🧭 Architecture Overview

Here's how Memoria is structured under the hood:

![Architecture Diagram](docs/Architecture.png)

---

## 🧭 Usage Walkthrough

1. **Open the app → “Log Your Memory”**  
   Begin by logging a memory. Add a short note with names, places, or dates, and optionally attach a photo.  

2. **“Test Your Memory”**  
   The local **GPT-OSS:20B** model gently generates 3–5 personalized questions from your own entries.  

3. **Answer & Score**  
   Respond in your own words. Answers are checked locally, and each correct response adds a **Zen stone** to your tower.  

4. **“Track Your Memory”**  
   View your recent results as stone towers, along with your **average score**, **best score**, and **number of tests taken**.  

5. **“AI Feedback”**  
   Receive supportive insights — encouragement, highlighted strengths, and simple tips to keep memory practice engaging.  

6. **Alerts (optional)**  
   If your recent average score drops below the safe threshold (default: **50%**), Memoria gently prompts you to notify a trusted caregiver or family member.  

> 🌸 With each session, Memoria turns personal moments into gentle practice — helping patients and families walk the memory journey with hope and care.  

---

## 📺 Demo Video

🎥 [Watch the Memoria Demo on YouTube](https://youtu.be/07mKm7GgE84?si=Mt5-NDHhiJThePcE)

---

## 🧠 Powered by GPT-OSS:20B

Memoria integrates **GPT-OSS:20B**, a powerful open-source local LLM, to create a truly personalized memory companion.  
Instead of generic tests, the model works directly with your logged memories to provide meaningful, supportive interactions.  

Each session includes:  
- 📝 **Personalized Memory Quizzes** — Questions generated from your own entries (names, events, places)  
- 🎯 **Smart Scoring** — Evaluates answers in natural language, not just exact matches  
- 🪨 **Zen Stones Tracking** — Correct answers add to a calming visual progress tower  
- 💡 **Supportive AI Feedback** — Encouraging insights, strengths, and gentle reminders  
- ⚠️ **Early Decline Alerts** — Detects when performance drops and prompts caregiver notification  
- 🔐 **Local-First Processing** — All AI runs on-device; no data ever leaves your system  

> GPT-OSS:20B transforms Memoria into more than an app — it becomes a compassionate, intelligent companion for those living with Alzheimer’s and their families.  


---

## 🖼️ App Screenshots

| Home Screen | Log Memory Screen | Test Memory Screen | Test Result Screen | Memory Progress Screen | AI Feedback Screen |
|-------------|---------------|----------------|-------------|---------------|----------------|
| ![Home](assets/Home_screen.png) | ![Log](assets/Log_memory_screen.png) | ![Test](assets/Test_your_memory_screen.png) | ![Result](assets/Test_result_screen.png) | ![Progress](assets/Memory_progress_screen.png) | ![Feedback](assets/AI_feedback_screen.png) |

---
## 🚧 Future Enhancements

Memoria is designed to evolve with the needs of patients, families, and caregivers. Here are some planned features and ideas for future versions:

- 📅 **Monthly & Yearly Progress Summaries** – Reflect on memory performance across longer timelines  
- 📊 **Advanced Caregiver Dashboard** – Provide a clear view of trends, strengths, and areas of concern  
- 🧠 **Model Choice Toggle** – Option to switch between GPT-OSS:20B and lighter local models for different devices  
- 🔔 **Smart Reminders** – Gentle nudges to log memories or take a test at user-friendly times  
- 🌍 **Multi-language Support** – Localized experience for global accessibility (starting with Spanish, German, Japanese)  
- 🎨 **Customizable Zen Stone Themes** – Different calming visuals to personalize progress tracking  
- 🪄 **Voice Interaction Mode** – Speak your answers and receive AI feedback in natural conversation  
- 📤 **Secure Export** – Share progress reports or AI feedback summaries with doctors or caregivers in PDF format  

> 💡 Have ideas to contribute? Open an issue or start a discussion — your input can help shape Memoria’s future!  

---

## 🚀 Local Setup

```bash
git clone https://github.com/HarshavardhanaNaganagoudar/Memoria.git
cd Memoria
```
---

## 📄 License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** license.

You are free to:

- ✅ Share — copy and redistribute the app in any medium or format  
- ✅ Adapt — remix, transform, and build upon the app

Under the following terms:

- ✍️ **Attribution** — You must give appropriate credit, link to this license, and indicate if changes were made.  
- 🚫 **NonCommercial** — You may not use the material for commercial purposes.

🔗 [View the full license terms here](https://creativecommons.org/licenses/by-nc/4.0/)

