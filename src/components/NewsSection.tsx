const NewsSection = () => (
  <section id="news" className="py-16 px-4 sm:px-6 lg:px-8">
    <div className="container mx-auto">
      <h2 className="text-4xl font-bold text-center mb-10 font-display text-foreground">
        <strong>News and Media</strong>
      </h2>
      <div className="text-center">
        <a
          href="#"
          className="inline-block px-8 py-3 rounded-full text-primary-foreground font-medium text-lg"
          style={{ background: "linear-gradient(105deg, hsl(var(--accent)), hsl(var(--accent) / 0.68))" }}
        >
          Read more..
        </a>
      </div>
    </div>
  </section>
);

export default NewsSection;
