/* All learning content in one place, linked by stable ids. */
window.Dive = window.Dive || {};

Dive.content = {
  folders: [
    { id: "root", label: "quiz-plugin/", level: 0 },
    { id: "skills", label: "skills/", level: 1 },
    { id: "skill", label: "quiz-maker/", level: 2 },
    { id: "assets", label: "assets/", level: 3 },
    { id: "references", label: "references/", level: 3 }
  ],

  files: [
    {
      id: "manifest",
      name: "plugin.json",
      target: "root",
      explain: "זה קובץ הזיהוי: השדות name, version ו־description אומרים למערכת איזה פלאגין זה. הוא מתאר את הפלאגין כולו, ולכן מקומו בתיקייה הראשית.",
      hint: "הקובץ מתאר את הפלאגין כולו. חפשו את התיקייה העליונה."
    },
    {
      id: "readme",
      name: "README.md",
      target: "root",
      explain: "זה ההסבר לאנשים: מה הפלאגין עושה, למי הוא מיועד ואיך משתמשים בו. מי שפותח את התיקייה צריך למצוא אותו מיד, ולכן מקומו בתיקייה הראשית.",
      hint: "מי שפותח את התיקייה צריך למצוא אותו מיד."
    },
    {
      id: "skillfile",
      name: "SKILL.md",
      target: "skill",
      explain: "זה קובץ ההוראות של המיומנות: מתי לפעול ומה לעשות, צעד אחרי צעד. הוא שייך למיומנות אחת, ולכן מקומו בתיקייה quiz-maker.",
      hint: "הקובץ שייך למיומנות אחת מסוימת."
    },
    {
      id: "template",
      name: "question-template.md",
      target: "assets",
      explain: "זו התבנית, השלד של התוצר. זה חומר עזר שההוראות מפנות אליו בשורה Template, ולכן מקומו בתיקייה assets.",
      hint: "זה שלד למילוי. בדקו מה כתוב בשורה Template."
    },
    {
      id: "input",
      name: "sample-input.txt",
      target: "references",
      explain: "זו דוגמת קלט: איך נראה קטע הדרכה מתאים. ההוראות מפנות אליה בשורה Examples, ולכן מקומה בתיקייה references, לצד דוגמת הפלט.",
      hint: "זו דוגמה. בדקו מה כתוב בשורה Examples."
    },
    {
      id: "output",
      name: "sample-output.md",
      target: "references",
      explain: "זו דוגמת פלט: איך נראה תוצר תקין. ההוראות מפנות אליה בשורה Examples, ולכן מקומה בתיקייה references, לצד דוגמת הקלט.",
      hint: "זו דוגמה. בדקו מה כתוב בשורה Examples."
    }
  ],

  /* The path the request follows through the learner's own arrangement. */
  route: [
    { file: "manifest", found: "הפלאגין זוהה.", lost: "הפלאגין לא זוהה, כי קובץ הזיהוי לא נמצא בתיקייה הראשית." },
    { file: "skillfile", found: "ההוראות נטענו.", lost: "המיומנות לא נמצאה, כי SKILL.md לא נמצא בתיקייה שלה." },
    { file: "template", found: "התבנית נמצאה, ולתוצר יהיה מבנה קבוע.", lost: "השורה Template מפנה למקום ריק, ולכן לתוצר לא יהיה מבנה קבוע." },
    { file: "input", found: "דוגמת הקלט נמצאה.", lost: "השורה Examples מפנה למקום ריק, ולכן חסרה דוגמת קלט." },
    { file: "output", found: "דוגמת הפלט נמצאה.", lost: "השורה Examples מפנה למקום ריק, ולכן חסרה דוגמת פלט." }
  ],

  /* Depth 40: does the skill wake up for this message? */
  chat: [
    {
      text: "הנה קטע על פישינג. תכין ממנו 3 שאלות תרגול.",
      wakes: true,
      reply: "הבקשה מתאימה בדיוק לשדה description: יש קטע הדרכה, ומבקשים ממנו שאלות תרגול."
    },
    {
      text: "תסכם לי את הפגישה של אתמול.",
      wakes: false,
      reply: "סיכום פגישה לא קשור למה שכתוב בשדה description, ולכן ChatGPT עונה כרגיל, בלי המיומנות."
    },
    {
      text: "תכתוב לי חידון על בירות העולם.",
      wakes: false,
      reply: "אמנם מבקשים שאלות, אבל אין קטע הדרכה. לפי השדה description, המיומנות יוצרת שאלות רק מתוך קטע שמספקים לה."
    }
  ],

  /* Ascent, stage 1. Every option answers back with its own reason. */
  lens: {
    /* The task is written the way it will appear in the instructions: as a request to the plugin. */
    parts: {
      who: " לאיש למידה",
      out: " שלוש שאלות תרגול עם משוב",
      in: " מתוך קטע ההדרכה שהוא מספק",
      limit: ", על סמך הקטע בלבד"
    },
    rings: [
      {
        id: "who",
        legend: "למי הפלאגין מיועד?",
        options: [
          { text: "לכל מי שנכנס לצ׳אט", right: false, feedback: "״כולם״ זה רחב מדי. בדוגמה הפלאגין נבנה לאיש למידה, ובשבילו בוחרים את הסגנון ואת סוג השאלות." },
          { text: "לאיש למידה", right: true, feedback: "כשיודעים מי המשתמש, יודעים אילו שאלות יעזרו לו." }
        ]
      },
      {
        id: "in",
        legend: "מה נותנים לפלאגין?",
        options: [
          { text: "קטע הדרכה", right: true, feedback: "הקטע הוא חומר הגלם, וממנו בונים את השאלות." },
          { text: "נושא כללי, בלי קטע", right: false, feedback: "בלי קטע אין על מה להסתמך, וחזרנו לבעיה שבגללה בנינו פלאגין: ChatGPT ימציא בעצמו." }
        ]
      },
      {
        id: "out",
        legend: "מה מקבלים ממנו?",
        options: [
          { text: "כמה שאלות, כמה שיוצא", right: false, feedback: "״כמה שיוצא״ ייתן תוצאה אחרת בכל פעם. בדוגמה מגדירים מספר קבוע: שלוש שאלות עם משוב." },
          { text: "שלוש שאלות עם משוב", right: true, feedback: "תוצר מוגדר מאפשר לבדוק אם הפלאגין עשה את העבודה." }
        ]
      },
      {
        id: "limit",
        legend: "על מה השאלות מסתמכות?",
        options: [
          { text: "רק על מה שכתוב בקטע", right: true, feedback: "זה הגבול החשוב ביותר: כך שאלות לא מלמדות מידע שלא היה בהדרכה." },
          { text: "גם על ידע כללי שנראה נכון", right: false, feedback: "ידע כללי עלול להיות לא מדויק או לא מתאים לארגון. בדוגמה מסתמכים רק על הקטע." }
        ]
      }
    ]
  },

  /* Ascent, stage 2: turn off one instruction line and see what breaks. */
  saboteur: {
    lines: [
      { id: "grounded", text: "הסתמך רק על המידע שבקטע", missing: "השאלה כבר לא מבוססת על הקטע: היא שואלת על החלפת סיסמה, נושא שהקטע לא מזכיר." },
      { id: "options", text: "צור שלוש אפשרויות ותשובה נכונה אחת", missing: "מספר האפשרויות השתנה: נשארו שתיים בלבד, וקל לנחש את התשובה." },
      { id: "feedback", text: "כתוב משוב קצר", missing: "המשוב נעלם: הלומד לא יודע למה התשובה נכונה." },
      { id: "template", text: "השתמש בתבנית", missing: "אין מבנה קבוע: הכול נכתב בשורה אחת, וקשה לקרוא ולהעתיק לתרגול." }
    ],
    question: {
      text: "מהו סימן אזהרה לפי הקטע?",
      fabricated: "כל כמה זמן צריך להחליף סיסמה?",
      options: ["הודעה קצרה", "בקשה דחופה למסור סיסמה", "כותרת בצבע כחול"],
      fabricatedOptions: ["כל 90 יום", "כל שנה", "אף פעם"],
      answer: "ב",
      fabricatedAnswer: "א",
      feedback: "הקטע מציג בקשה דחופה למסור סיסמה כסימן אזהרה.",
      fabricatedFeedback: "מקובל להחליף סיסמה מדי פעם."
    }
  },

  /* Ascent, stage 4: each line answers back on its own. */
  inspector: [
    {
      id: "a",
      text: "מה בודקים לפני לחיצה על קישור? כתובת השולח.",
      bad: false,
      feedback: "השאלה הזו דווקא מבוססת על הקטע: כתוב בו במפורש שבודקים את כתובת השולח לפני לחיצה. חפשו שאלה על משהו שהקטע לא מזכיר."
    },
    {
      id: "b",
      text: "כל כמה זמן מחליפים סיסמה? כל 90 יום.",
      bad: true,
      feedback: "מצאתם אותה. הקטע לא מזכיר החלפת סיסמה בכלל, ו־ChatGPT הוסיף ידע כללי משלו. התוצר נכשל בבדיקה, והתיקון הוא לחזק בהוראות את השורה ״הסתמך רק על המידע שבקטע״."
    },
    {
      id: "c",
      text: "מה עושים בהודעה חשודה? לא לוחצים ומדווחים לגורם המוסמך.",
      bad: false,
      feedback: "גם זה כתוב בקטע: כשהודעה נראית חשודה לא לוחצים על הקישור ומדווחים. השאלה תקינה, והשאלה הבעייתית היא אחרת."
    }
  ],

  form: {
    matchRoles: [
      { file: "manifest", role: "קובץ הזיהוי של הפלאגין", why: "הוא מכיל את השדות name, version ו־description. כשהפלאגין נטען, המערכת מזהה אותו דרכם, ולכן הקובץ נמצא בתיקייה הראשית. בלעדיו הפלאגין לא יזוהה בכלל." },
      { file: "readme", role: "הסבר לאנשים שקוראים", why: "זה קובץ טקסט שנכתב בשביל אנשים: מה הפלאגין עושה ואיך משתמשים בו. המערכת לא נעזרת בו כשהפלאגין רץ, אבל בלעדיו מי שפותח את התיקייה לא יבין מה הפלאגין עושה." },
      { file: "skillfile", role: "מתי לפעול ואיך", why: "זה קובץ ההוראות של המיומנות. כשמגיעה בקשה, ChatGPT קורא את השדה description כדי להחליט אם להפעיל את המיומנות, ואז מבצע את ההוראות צעד אחרי צעד. בלעדיו המיומנות לא תפעל." },
      { file: "template", role: "השלד של התוצר", why: "זו התבנית שבתיקייה assets. ההוראות מפנות אליה בשורה Template, ולכן כל שאלה יוצאת באותו מבנה. אם ההוראות לא ימצאו אותה, כל שאלה תיראה אחרת." },
      { file: "output", role: "דוגמה לתוצר תקין", why: "זו דוגמת הפלט שבתיקייה references. ההוראות מפנות אליה בשורה Examples, ו־ChatGPT מחקה אותה כשהוא כותב את השאלות. בלעדיה התוצאה פחות עקבית." }
    ],
    firstStep: {
      right: "task",
      feedback: {
        task: "קודם מגדירים למי הפלאגין עוזר, מה נותנים לו ומה מקבלים ממנו. כל השלבים הבאים נשענים על ההגדרה הזו.",
        organize: "בחרתם בארגון הקבצים. אבל אי אפשר לדעת אילו קבצים צריך ואיפה לשים אותם לפני שיודעים מה המשימה ומה ההוראות מבקשות.",
        write: "בחרתם בכתיבת הוראות. אבל כדי לדעת מה לכתוב בהוראות, צריך קודם להגדיר את המשימה: למי, מה הקלט ומה הפלט.",
        test: "בחרתם בבדיקה. אבל בלי משימה מוגדרת אין למה להשוות את התוצר, ולכן הגדרת המשימה באה ראשונה."
      }
    },
    checks: {
      grounded: {
        right: true,
        picked: "בדיקה נחוצה: שאלה שלא מבוססת על הקטע מלמדת מידע שלא היה בהדרכה.",
        missed: "את זו פספסתם: צריך לוודא שכל שאלה מבוססת על הקטע, כמו בשלב 4 שבו מצאתם את שאלת הסיסמה."
      },
      format: {
        right: true,
        picked: "בדיקה נחוצה: כך מוודאים שלכל שאלה יש שלוש אפשרויות, תשובה נכונה ומשוב, כמו בתבנית.",
        missed: "את זו פספסתם: צריך לוודא שהתוצר בנוי לפי התבנית, אחרת כל שאלה תיראה אחרת."
      },
      folders: {
        right: false,
        picked: "את זו לא צריך לסמן: התיקיות מארגנות את קבצי הפלאגין, ואין קשר בין מספר התיקיות למספר השאלות.",
        missed: "נכון שלא סימנתם: מספר התיקיות לא אומר דבר על איכות השאלות."
      }
    },
    count: {
      right: 2,
      feedback: {
        right: "SKILL.md מפנה לתיקייה assets (בשורה Template) ולתיקייה references (בשורה Examples). יחד: שתי תיקיות.",
        three: "ספרתם קבצים: תבנית אחת ושתי דוגמאות. אבל שתי הדוגמאות נמצאות באותה תיקייה, references, ולכן יש רק שתי תיקיות.",
        one: "ספרתם תיקייה אחת. השורה Template מפנה ל־assets, והשורה Examples מפנה לתיקייה אחרת: references.",
        zero: "ההוראות כן מפנות לתיקיות: חזרו לשורות Template ו־Examples שבעומק 60 מ׳.",
        few: "בדוגמה שלנו יש בסוף SKILL.md רק שתי שורות הפניה, Template ו־Examples, והן מפנות לשתי תיקיות: assets ו־references.",
        many: "פלאגין גדול יכול להפנות להרבה תיקיות, אבל בדוגמה שלנו יש בסוף SKILL.md רק שתי שורות הפניה, Template ו־Examples, והן מפנות לשתי תיקיות: assets ו־references.",
        format: "כתבו את התשובה בספרות, למשל 4.",
        negative: "מספר תיקיות לא יכול להיות שלילי. כתבו מספר שלם, 0 או יותר.",
        fraction: "תיקיות סופרים במספרים שלמים: כל תיקייה היא מקום אחד. כתבו מספר שלם."
      },
      /* Shown with every answer: why the structure matters when the plugin runs. */
      link: "למה זה חשוב: ההוראות מוצאות את התבנית ואת הדוגמאות רק לפי הנתיב. אם הקבצים יזוזו מהתיקיות האלה, התוצר יאבד את המבנה הקבוע ואת הדוגמאות."
    },
    thanks: "תודה ששיתפתם! כל דבר שלמדנו, גם אם הוא נראה קטן, הוא צעד משמעותי בדרך."
  },

  /* Five terms that beginners stop at. Plain words, at most two sentences, no other unexplained terms. */
  glossary: [
    {
      id: "plugin",
      term: "פלאגין",
      def: "תוסף ל־ChatGPT. זו תיקייה עם כמה קבצים, שמלמדים את הצ׳אט לעשות משימה אחת, באותה דרך בכל פעם."
    },
    {
      id: "skill",
      term: "Skill (מיומנות)",
      def: "״מתכון״ כתוב שנמצא בתוך הפלאגין. הוא אומר ל־ChatGPT מתי להתחיל לעבוד, מה לעשות ואיך התוצאה צריכה להיראות."
    },
    {
      id: "instructions",
      term: "קובץ הוראות",
      def: "הקובץ <code dir=\"ltr\" lang=\"en\">SKILL.md</code>. כתוב בו, צעד אחרי צעד, מה ChatGPT צריך לעשות, ובאילו קבצים נוספים להיעזר."
    },
    {
      id: "assets",
      term: "חומרי עזר",
      def: "קבצים שעוזרים ל־ChatGPT בזמן העבודה. למשל תבנית שמראה איך כל שאלה צריכה להיראות. בדוגמה שלנו הם בתיקייה <code dir=\"ltr\" lang=\"en\">assets/</code>."
    },
    {
      id: "example",
      term: "דוגמת שימוש",
      def: "ניסיון אמיתי: נותנים לפלאגין קטע, ורואים מה יוצא. כך בודקים אם הפלאגין עושה בדיוק מה שתכננו."
    }
  ],

  /* Everything that differs between the two tracks. The plugin, the files and the example stay the same. */
  tracks: {
    labels: { first: "התנסות ראשונה", refresh: "ריענון לאחר התנסות" },

    /* Refresh, check 2: when does the skill wake up? Same shape as the lens rings (green/red feedback). */
    checks: {
      /* Where does the Template path break? Three plain answers, same card look as the questions below. */
      path: [
        {
          id: "s39",
          legend: "איפה השרשרת נשברת?",
          options: [
            { text: "בתיקייה quiz-maker/: היא לא קיימת", right: false, feedback: "התיקייה quiz-maker/ דווקא קיימת, ו־SKILL.md נמצא בה. הבעיה נמצאת בהמשך הנתיב." },
            { text: "בתיקייה assets/: היא לא קיימת", right: false, feedback: "גם assets/ קיימת, היא פשוט ריקה. הבעיה היא במה שאמור להיות בתוכה." },
            { text: "בקובץ question-template.md: הוא לא נמצא ב־assets/", right: true, feedback: "בדיוק! התיקייה assets/ קיימת, אבל התבנית שמורה ב־references/. ההוראות מחפשות רק בנתיב שכתוב בהן, ולכן לא מוצאות אותה. התיקון: להחזיר את הקובץ ל־assets/." }
          ]
        }
      ],
      skills: [
        {
          id: "s40",
          legend: "מישהו כתב בשדה description: ״עוזר כללי לכל דבר״. מה יקרה?",
          options: [
            { text: "המיומנות תתעורר גם בבקשות שלא קשורות אליה", right: true, feedback: "בדיוק. ChatGPT מחליט לפי השדה הזה, ותיאור כללי מדי מעיר את המיומנות גם כשמבקשים סיכום פגישה." },
            { text: "שום דבר, ההוראות עצמן חשובות יותר", right: false, feedback: "ההוראות חשובות, אבל ChatGPT קורא אותן רק אחרי שהחליט להפעיל את המיומנות, וההחלטה נעשית לפי description." },
            { text: "ChatGPT יפסיק לזהות את הפלאגין", right: false, feedback: "את הפלאגין מזהה plugin.json. השדה description קובע מתי המיומנות מתעוררת, ותיאור כללי מעיר אותה יותר מדי." }
          ]
        },
        {
          id: "s41",
          legend: "המיומנות בדוגמה (quiz-maker) מכינה שלוש שאלות תרגול מתוך קטע הדרכה. איזה תיאור הכי מתאים לשדה description שלה?",
          options: [
            { text: "<span dir=\"ltr\" lang=\"en\">Makes quizzes.</span>", right: false, feedback: "קצר מדי. המיומנות תתעורר גם לחידון על בירות העולם, אף שאין שם קטע הדרכה לבנות ממנו שאלות." },
            { text: "<span dir=\"ltr\" lang=\"en\">Create three practice questions from a supplied training passage.</span>", right: true, feedback: "מדויק. כתוב מה המיומנות עושה (שלוש שאלות תרגול) ומתי (כשמספקים קטע הדרכה). כך היא מתעוררת רק כשצריך." },
            { text: "<span dir=\"ltr\" lang=\"en\">Helps learning teams.</span>", right: false, feedback: "כללי מדי. לא כתוב מה המיומנות עושה, ולכן ChatGPT לא יודע מתי להפעיל אותה." }
          ]
        }
      ]
    },

    /* Refresh, check 3: three questions the plugin produced. Mark the ones that need fixing. */
    outputAudit: [
      {
        id: "o1",
        lines: ["שאלה 1: מה צריך לבדוק לפני לחיצה על קישור?", "אפשרות א: כתובת השולח.", "אפשרות ב: צבע הרקע.", "אפשרות ג: מספר השורות בהודעה.", "תשובה נכונה: א.", "משוב: בקטע מוסבר שיש לבדוק את כתובת השולח."],
        bad: false,
        note: "השאלה מבוססת על הקטע, ויש בה שלוש אפשרויות, תשובה נכונה ומשוב, בדיוק לפי התבנית."
      },
      {
        id: "o2",
        lines: ["שאלה 2: כל כמה זמן מחליפים סיסמה?", "אפשרות א: כל 90 יום.", "אפשרות ב: כל שנה.", "אפשרות ג: אף פעם.", "תשובה נכונה: א.", "משוב: מקובל להחליף סיסמה מדי פעם."],
        bad: true,
        note: "הקטע לא מזכיר החלפת סיסמה בכלל, ו־ChatGPT הוסיף ידע משלו. התיקון: בכתיבת ההוראות מחזקים ב־SKILL.md את השורה ״הסתמך רק על המידע שבקטע״."
      },
      {
        id: "o3",
        lines: ["שאלה 3: מה עושים בהודעה חשודה?", "אפשרות א: לא לוחצים על הקישור ומדווחים.", "אפשרות ב: עונים לשולח ושואלים.", "תשובה נכונה: א."],
        bad: true,
        note: "התוכן מבוסס על הקטע, אבל המבנה שבור: רק שתי אפשרויות ואין משוב. זה סימן שהתבנית לא נמצאה. בודקים את השורה Template ואת המקום של question-template.md."
      }
    ],

    /* Refresh practice: an arrangement that "someone already built", with three mistakes. */
    arrangement: {
      manifest: "root",
      readme: "skill",
      skillfile: "skills",
      template: "assets",
      input: "references",
      output: "assets"
    },
    /* Why each misplaced file in that arrangement is a problem. */
    auditNotes: {
      readme: "README.md שמור בתוך quiz-maker/. הפלאגין יעבוד, אבל מי שיפתח את התיקייה הראשית לא ימצא שום הסבר.",
      skillfile: "SKILL.md שמור ישר בתוך skills/, מחוץ לתיקייה של המיומנות. שם ChatGPT לא מחפש, ולכן המיומנות לא תימצא.",
      output: "sample-output.md שמור ב־assets/, אבל השורה Examples מפנה אל references/. דוגמת הפלט לא תימצא."
    },

    /* Refresh: what to check in a plugin someone already built. Shown in the closing summary. */
    checklist: [
      "<code dir=\"ltr\" lang=\"en\">plugin.json</code> ו־<code dir=\"ltr\" lang=\"en\">README.md</code> נמצאים בתיקייה הראשית.",
      "לכל מיומנות יש תיקייה משלה בתוך <code dir=\"ltr\" lang=\"en\">skills/</code>, ובה <code dir=\"ltr\" lang=\"en\">SKILL.md</code>.",
      "השדה <code dir=\"ltr\" lang=\"en\">description</code> מתאר בדיוק מתי להפעיל את המיומנות.",
      "כל נתיב בשורות <code dir=\"ltr\" lang=\"en\">Template</code> ו־<code dir=\"ltr\" lang=\"en\">Examples</code> מוביל לקובץ שקיים.",
      "בדיקת דוגמת שימוש: השאלות מבוססות על הקטע ובנויות לפי התבנית."
    ]
  },

  /* Closing form, refresh track. Every question checks the same plugin, from the angle of finding what to fix. */
  refreshForm: {
    match: {
      /* Each symptom points to one file. label: a short name for the LMS report (SCORM text is limited to 255 characters). */
      items: [
        { id: "m1", label: "לא מזוהה", answer: "manifest", prompt: "הפלאגין לא מופיע ב־ChatGPT בכלל.", why: "את הפלאגין מזהים לפי plugin.json שבתיקייה הראשית. אם הוא חסר או לא במקום, אין פלאגין." },
        { id: "m2", label: "לא מתעוררת", answer: "skillfile", prompt: "יש בקשה מתאימה, אבל המיומנות לא מתעוררת.", why: "ההחלטה אם להפעיל את המיומנות נעשית לפי השדה description שב־SKILL.md. בודקים את השדה, וגם שהקובץ נמצא בתיקייה של המיומנות." },
        { id: "m3", label: "מבנה משתנה", answer: "template", prompt: "כל שאלה יוצאת במבנה אחר.", why: "המבנה הקבוע מגיע מהתבנית question-template.md. אם השורה Template לא מוצאת אותה, אין לשאלות שלד משותף." },
        { id: "m4", label: "לא כמו הדוגמה", answer: "output", prompt: "השאלות לא דומות לתוצר התקין שתכננו.", why: "ChatGPT מחקה את דוגמת הפלט sample-output.md. אם היא לא נמצאת או לא מדויקת, אין לו למה להשוות." },
        { id: "m5", label: "לא מובן לאנשים", answer: "readme", prompt: "עמית פתח את התיקייה ולא הבין מה הפלאגין עושה.", why: "את ההסבר לאנשים כותבים ב־README.md, והוא צריך להיות בתיקייה הראשית, איפה שכולם מסתכלים קודם." }
      ],
      /* A fixed order keeps the files apart from the symptom order. */
      order: ["readme", "template", "manifest", "output", "skillfile"]
    },
    stage: {
      right: "write",
      feedback: {
        write: "בדיוק. מחזקים ב־SKILL.md את השורה ״הסתמך רק על המידע שבקטע״, ואחרי התיקון בודקים שוב דוגמת שימוש.",
        task: "הגדרת המשימה כבר אומרת ״על סמך הקטע בלבד״. הבעיה היא שההוראות לא מקפידות על זה, ולכן מתקנים בכתיבת ההוראות.",
        organize: "ארגון הקבצים משפיע על המבנה ועל הדוגמאות, אבל לא על התוכן של השאלה. כאן צריך לתקן את ההוראות עצמן.",
        test: "הבדיקה היא מה שגילה את הבעיה, אבל היא לא מתקנת אותה. מתקנים בכתיבת ההוראות, ואז בודקים שוב."
      }
    },
    /* Q3 instruction: at most two ticks. Ticking more is a validation message, not a wrong answer. */
    checksMax: 2,
    checksTooMany: "סימנתם את כל שלוש האפשרויות. לפי ההנחיה אפשר לסמן תשובה אחת או שתיים: בחרו רק את המצבים שבאמת מראים קובץ טעון תיקון.",
    checks: {
      skillspot: {
        right: true,
        picked: "נכון. כל מיומנות צריכה תיקייה משלה, ו־SKILL.md צריך להיות בתוכה. אחרת ההוראות לא יימצאו.",
        missed: "את זה פספסתם: SKILL.md מחוץ לתיקיית המיומנות הוא תקלה, כי ChatGPT לא ימצא את ההוראות."
      },
      path: {
        right: true,
        picked: "נכון. ההוראות מוצאות קובץ רק לפי הנתיב, ולכן התבנית לא תימצא.",
        missed: "את זה פספסתם: כשהנתיב בהוראות לא מוביל לקובץ, הקובץ כאילו לא קיים."
      },
      readme: {
        right: false,
        picked: "את זה לא צריך לסמן: התיקייה הראשית היא בדיוק המקום של README.md.",
        missed: "נכון שלא סימנתם: README.md במקום הנכון, בתיקייה הראשית."
      }
    },
    pick: {
      right: "input",
      feedback: {
        input: "בדיוק! sample-input.txt שמור ב־assets/, אבל השורה Examples מפנה אל references/. מחזירים אותו לשם, ליד דוגמת הפלט.",
        skillfile: "SKILL.md נמצא בתוך quiz-maker/, בדיוק במקום שלו. חפשו קובץ שהנתיב בהוראות לא מוביל אליו.",
        template: "question-template.md נמצא ב־assets/, ולשם בדיוק מפנה השורה Template. הוא במקום.",
        output: "sample-output.md נמצא ב־references/, כמו שכתוב בשורה Examples. הוא במקום."
      },
      link: "למה זה חשוב: בסידור קיים, הדרך המהירה למצוא תקלה היא לעבור על כל נתיב בהוראות ולבדוק שהוא באמת מוביל לקובץ."
    }
  }
};
