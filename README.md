## talos

Talos is meant to be a powerful interface to easily create automated workflows
that uses large language models (LLMs) to parse, extract, summarize, etc. different
types of content and push it to other APIs/databases/etc.

Think [Zapier](https://en.wikipedia.org/wiki/Zapier) but with language model magic 🪄.

<p align="center">
   <a href="http://www.youtube.com/watch?v=wDnmEqclsBY">
      <img src="./docs/example.gif" width="640">
   </a>
</p>
Click to play video. Note: the summarization step is sped up (~1 minute).

## Example Workflows

### Read this Wikipedia page & extract some data from it.

[View workflow](./docs/examples/webpage-extract.png)

1. Fetch this wikipedia page.
2. Extract who the page is about, give a summary, and extract any topics discussed.
3. Put into a template.

### Read a Yelp review & tell me about it.

1. Read this Yelp review
2. Extract the sentiment and give me a list of complaints and/or praises
3. Put into a report template.
4. Email it to me.

### Summarize this book & generate a book report.

1. Read through this PDF file.
2. Create a bullet point summary of the entire book.
3. Generate key takeaways from the book
   3a. For each takeaway, elaborate
4. Combine into a template.

## Running Locally

To start running `talos` locally, install the dependencies

```bash
# Copy the environment variables
> cp .env.template .env.local
# Install dependencies
> npm install
# Start the front-end
> npm run start
```

The UI will be available at [http://localhost:3000/playground](http://localhost:3000/playground).

Now we need to start the backend.

### Using w/ memex

[memex](https://github.com/spyglass-search/memex) is a self-hosted LLM backend &
memory store that exposes basic LLM functionality as a RESTful API.

You will need to either download a local LLM model to use or add your OpenAI to
the `.env.template` file to get started.

```bash
> git clone https://github.com/spyglass-search/memex
> cd memex
> docker-compose up
```
