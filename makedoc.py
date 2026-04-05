import wikipediaapi

wiki = wikipediaapi.Wikipedia(
    language='en',
    user_agent='my-rag-app/1.0'
)

page = wiki.page("CD Projekt Red")

if page.exists():
    text = page.text

    with open("cd_projekt_red.txt", "w", encoding="utf-8") as f:
        f.write(text)

    print("File saved successfully!")
else:
    print("Page not found")