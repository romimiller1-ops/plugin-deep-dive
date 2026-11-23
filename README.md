# צוללים לתוך פלאגין

יחידת לימוד אינטראקטיבית על מבנה הפלאגין ב־ChatGPT ושלבי הפיתוח שלו, ארוזה כחבילת SCORM 1.2 למערכת Moodle.

- **קורס:** תכנות 3, מטלת אמצע, קבוצה 12
- **צוות:** דן כהן, רומי מילר
- **לקוח (מדומה):** מעבדת הבינה המלאכותית, המכון הטכנולוגי חולון (ליאת סהר, מובילה טכנולוגית)
- **קהל יעד:** אנשי למידה ארגונית ללא ניסיון בפיתוח פלאגינים

## מה יש ביחידה

מיד אחרי הברכה הלומד בוחר מסלול:

| מסלול | למי | משך | מה עושים |
|---|---|---|---|
| התנסות ראשונה | מי שעוד לא בנה פלאגין | כ־10 דקות | סרטון קצר, צלילה בתיקיות הפלאגין לדוגמה (`quiz-plugin`), סידור הקבצים בתיקיות, ארבעת שלבי הפיתוח, וטופס מסכם |
| ריענון לאחר התנסות | מי שכבר בנה דוגמה פשוטה | כ־6 דקות | בדיקת סידור קיים (זיהוי ואז תיקון), בדיקת נתיבים והשדה `description`, בדיקת התוצר, וטופס מסכם |

בנוסף, בשני המסלולים:

- **הסברי מושגים:** חמישה מושגים (פלאגין, Skill, קובץ הוראות, חומרי עזר, דוגמת שימוש). ההסבר נפתח בתוך הטקסט, ויש גם מילון מלא בחלונית צד.
- **גודל טקסט:** שלוש רמות (רגיל, בינוני, גדול). הבחירה נשמרת לאורך השימוש.
- **עצירת תנועה:** כפתור לעצירת התנועה. ברירת המחדל היא תנועה פעילה, אלא אם המכשיר מבקש להפחית תנועה.

## הרצה

- **ב־Moodle:** מעלים את קובץ ה־ZIP כפעילות SCORM. קובץ המניפסט (`imsmanifest.xml`) נמצא בשורש החבילה.
- **באתר החי (בלי LMS):** https://romimiller1-ops.github.io/plugin-deep-dive/
- **מחוץ למערכת למידה:** פותחים את `index.html` דרך שרת מקומי, למשל `python3 -m http.server`. היחידה עובדת במלואה, ומציגה הודעה שהתשובות והציון לא יישמרו.

## חיבור ל־LMS (SCORM 1.2)

כל הקריאות למערכת עוברות דרך `js/core/lms.js`, שמשתמש בעטיפה של pipwerks (`js/vendor/scorm-api-wrapper.js`).

- **בכניסה:** שם הלומד נקרא מ־`cmi.core.student_name` ומוצג בברכה ("Last, First" מוצג כ־"First Last"). הסטטוס מסומן `incomplete`.
- **בהגשה:** כל שאלה נשלחת כ־`cmi.interactions.n` נפרד, בסדר הזה:
  1. `Q0_learning_track`: המסלול שנבחר (ללא ניקוד).
  2. `Q1`–`Q4`: ארבע שאלות עם ניקוד. הסוגים: `matching`, `choice`, `numeric`.
  3. `Q5`: השאלה הפתוחה, אם נענתה (`fill-in`, ללא ניקוד).
- **ניקוד:** כל אחת מארבע השאלות שווה נקודה אחת. בשאלה 1 (התאמה של 5 פריטים) כל התאמה נכונה שווה 0.2. בשאלה 3 (3 אפשרויות, מותר לסמן עד שתיים) כל החלטה נכונה שווה ⅓: לסמן אפשרות נכונה, או לא לסמן אפשרות שגויה. בשאלות 2 ו־4 התשובה נכונה או שגויה. תשובה חלקית נשלחת ל־`result` כמספר עשרוני (למשל `0.8` או `0.33`).
- **ציון וסטטוס:** הציון הוא סכום הנקודות חלקי 4, כפול 100 ומעוגל. הוא נשמר ב־`cmi.core.score.raw` (0–100). ציון המעבר הוא 75, והסטטוס `passed` או `failed`. אחר כך יש שמירה אחת (commit) וסגירה.
- **לומד שכבר עבר:** הסטטוס ״עבר״ לא יורד, וציון גבוה קודם נשמר.
- **כשל בשמירה:** מוצג כפתור ״ניסיון חוזר״, שמשלח שוב רק את השדות שנכשלו.
- **מצב צפייה (review/browse):** שום דבר לא נכתב, וההגשה חסומה.
- **`cmi.suspend_data`:** שומר את גודל הטקסט בלבד.

## מבנה הקבצים

```
index.html                 the page (one page, both tracks)
imsmanifest.xml            SCORM 1.2 manifest
README.md                  this file
css/main.css               all styles (tokens in :root)
js/app.js                  bootstrap: starts every module in order
js/core/a11y.js            preferences before first paint: text size, motion
js/core/lms.js             SCORM adapter (the only place that talks to the LMS)
js/core/state.js           learner state and shared UI helpers
js/core/scoring.js         pure scoring and validation
js/core/track.js           learning-track choice and switching
js/data/content.js         all texts, answers and feedback
js/form/logbook.js         final form (both tracks) and the closing summary
js/form/report.js          builds the SCORM interaction records
js/games/*.js              the interactive activities
js/motion/*.js             depth gauge and background motion
js/ui/glossary.js          glossary terms and side panel
js/ui/textsize.js          text-size buttons
js/ui/navfit.js            top menu: full when it fits, folded otherwise
js/ui/tooltip.js           accessible tooltips for the icon buttons
js/vendor/                 pipwerks SCORM wrapper
assets/                    favicon, font, video, Bootstrap (with licenses)
```

## נגישות

- **תקן:** בנוי לפי WCAG 2.1 ברמה AA.
- **ניגודיות:** בכרטיסי המסלול ובסרגל העליון 7:1 לפחות.
- **מקלדת:** כל רכיב עובד במקלדת. הטולטיפים וההסברים נפתחים ונסגרים ב־Tab ובכפתור Esc, ואפשר לסמן ולהעתיק את הטקסט שלהם.
- **משוב:** תמיד מילה ואייקון, לא רק צבע. בטופס יש חיווי נפרד לתשובה חסרה, לא תקינה, נכונה, חלקית ושגויה.
- **רכיבים עם חלופה:** הגרירה, כרטיס הגירוד וזכוכית המגדלת דורשים עכבר או מגע. לכל אחד מהם יש חלופה בלחיצה או במקלדת.

## קרדיטים ורישיונות

- Bootstrap 5.3.8 ו־Bootstrap Icons: רישיון MIT (`assets/vendor/bootstrap/license.txt`, `assets/icons/bootstrap-icons-license.txt`)
- גופן Assistant: רישיון SIL OFL (`assets/fonts/ofl-license.txt`)
- עטיפת SCORM של pipwerks: רישיון MIT
- סרטון ההסבר הופק על ידי הצוות ב־HyperFrames. הקריינות נוצרה ב־AI: הקול Danit של ElevenLabs (elevenlabs.io).

## שימוש ב־AI

הקוד, הטקסטים, תסריט הסרטון ותוכנית הבדיקות נכתבו בסיוע Claude של Anthropic, ונבדקו ונערכו על ידי הצוות. הפירוט המלא נמצא בנספח תיעוד השימוש ב־AI שבמסמך המלווה.
