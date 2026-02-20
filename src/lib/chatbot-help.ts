export interface HelpCategory {
  category: string;
  icon: string;
  examples: string[];
}

export function getHelpContent(): HelpCategory[] {
  return [
    {
      category: "💰 Revenue & Sales",
      icon: "TrendingUp",
      examples: [
        "What was today's revenue?",
        "Show yesterday's sales",
        "Total revenue this week",
        "Revenue last 30 days",
        "Compare this week vs last week",
      ],
    },
    {
      category: "📦 Top Selling Items",
      icon: "Package",
      examples: [
        "Top 10 items today",
        "Top 5 items this week",
        "Best selling items last 30 days",
        "Show top 20 products this month",
      ],
    },
    {
      category: "📊 Item Performance",
      icon: "BarChart3",
      examples: [
        "How many Pizza sold today?",
        "Revenue from Burger this week",
        "Show Coffee sales last 7 days",
        "Items with no sales today",
      ],
    },
    {
      category: "🏷️ Category Analysis",
      icon: "Tags",
      examples: [
        "Sales by category today",
        "Top performing category this week",
        "Category comparison last 30 days",
      ],
    },
    {
      category: "💳 Payment Methods",
      icon: "CreditCard",
      examples: [
        "Payment method breakdown today",
        "Cash vs digital payments this week",
        "Most popular payment method",
      ],
    },
    {
      category: "👥 Employee Performance",
      icon: "Users",
      examples: [
        "Top selling employee today",
        "Employee sales ranking this week",
        "How much did John sell today?",
        "Compare employees' performance",
      ],
    },
    {
      category: "⏰ Attendance",
      icon: "Clock",
      examples: [
        "Who is working today?",
        "Attendance summary this week",
        "Show John's attendance last 30 days",
        "Who hasn't clocked out yet?",
      ],
    },
    {
      category: "🕐 Peak Hours",
      icon: "CalendarClock",
      examples: [
        "What time did we make most sales today?",
        "Show sales by hour today",
        "Peak sales hours this week",
        "Best selling time",
      ],
    },
    {
      category: "📈 Trends & Comparisons",
      icon: "TrendingUp",
      examples: [
        "Show revenue trend last 7 days",
        "Sales growth this month",
        "Compare Monday vs Friday sales",
        "Weekend vs weekday revenue",
      ],
    },
    {
      category: "🔢 Transactions",
      icon: "Receipt",
      examples: [
        "How many transactions today?",
        "Transaction count last 7 days",
        "Average sale value today",
        "Biggest sale this week",
      ],
    },
  ];
}

export function getQuickExamples(): string[] {
  return [
    "What was today's revenue?",
    "Top 10 items this week",
    "Employee sales ranking today",
    "Payment method breakdown",
    "Who is working today?",
    "Peak sales hours this week",
  ];
}

export function getHelpResponse(): string {
  const categories = getHelpContent();
  let response = "# 🤖 AI Assistant - Available Commands\n\n";
  response += "I can help you analyze your business data. Here are some things you can ask:\n\n";

  categories.forEach((cat, index) => {
    response += `## ${cat.category}\n\n`;
    cat.examples.forEach((example) => {
      response += `• ${example}\n`;
    });
    if (index < categories.length - 1) {
      response += "\n";
    }
  });

  response += "\n---\n\n";
  response += "💡 **Tips:**\n";
  response += "• Use natural language - I understand variations!\n";
  response += "• Specify time periods: today, yesterday, this week, last 30 days\n";
  response += "• Ask for specific numbers: top 5, top 10, top 20\n";
  response += "• Name specific items or employees in your queries\n\n";
  response += "⚠️ **Data Availability:**\n";
  response += "• Detailed data available for last 60 days\n";
  response += "• Older data shows monthly summaries only\n\n";
  response += "Try asking a question or type **HELP** anytime!";

  return response;
}

export function getPoliteResponseText(): string {
  const responses = [
    "You're welcome! Happy to help you with your business data. 😊",
    "My pleasure! Let me know if you need any other reports. 🚀",
    "Glad I could help! Feel free to ask more questions about your sales. 📊",
    "Anytime! I'm here to help you analyze your performance. 💼",
    "You're welcome! Is there anything else you'd like to check? ✨",
    "Happy to serve! Your business success is my priority. 🌟",
    "No problem at all! I'm ready for your next question. 🤖",
    "Thanks! I do my best to provide accurate insights. 📈"
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

export function getOutOfContextResponseText(): string {
  const responses = [
    "I'm focused on your business data! Try asking about sales, top items, or employee performance. 📊",
    "I can't help with that, but I can tell you all about your revenue and transactions! 💰",
    "I'm your POS assistant, specialized in sales reports. Ask me about your top selling items! 📦",
    "That's outside my expertise. I recommend asking about your daily sales or inventory trends instead. 📉",
    "I didn't quite get that. I can help with sales reports, inventory, and business analytics. Type **HELP** for examples. ❓",
    "I'm a bit of a workaholic - I only know about your business stats! Try asking 'revenue today'. 🤖"
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}