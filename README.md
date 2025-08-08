# Next.js Chatbot Embed

This project is a simple chatbot application built with Next.js and styled using Tailwind CSS. It consists of two main pages: a chatbot interface that can be embedded in an iframe and a configuration page that allows users to customize the iframe settings.

## Project Structure

```
nextjs-chatbot-embed
├── src
│   └── app
│       ├── chat
│       │   └── page.tsx         # Chatbot UI page
│       ├── embed
│       │   └── page.tsx         # Embed configuration page
│       ├── components
│       │   ├── ChatBot.tsx       # ChatBot component
│       │   ├── EmbedForm.tsx      # Form for customizing iframe
│       │   └── PreviewFrame.tsx    # Preview of the iframe
│       ├── globals.css           # Global styles including Tailwind CSS
│       └── layout.tsx            # Layout component for the application
├── package.json                  # NPM configuration file
├── tailwind.config.js            # Tailwind CSS configuration
├── next.config.js                # Next.js configuration
└── README.md                     # Project documentation
```

## Features

- **Chatbot Interface**: The `/chat` page provides a simple chatbot UI that simulates chat messages. It accepts query parameters to customize its appearance, including width, height, background color, text color, button color, and border radius.

- **Embed Configuration**: The `/embed` page allows users to customize the iframe settings. Users can adjust the size, colors, and border radius of the iframe and see a live preview. There is also a button to copy the iframe code for easy embedding.

## Getting Started

To get started with this project, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd nextjs-chatbot-embed
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000/chat` to see the chatbot or `http://localhost:3000/embed` to customize the iframe.

## Customization

You can customize the chatbot's appearance by passing the following query parameters in the URL:

- `width`: Set the width of the chatbot.
- `height`: Set the height of the chatbot.
- `bgColor`: Set the background color of the chatbot.
- `textColor`: Set the text color of the chatbot.
- `buttonColor`: Set the button color of the chatbot.
- `borderRadius`: Set the border radius of the chatbot.

## Future Improvements

- Implement a backend to store user settings for the iframe.
- Enhance the chatbot functionality with real-time messaging.
- Add more customization options for the chatbot interface.

## License

This project is open-source and available under the MIT License.