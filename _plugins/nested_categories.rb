module Jekyll
  class NestedCategoryPageGenerator < Generator
    safe true
    priority :low

    def generate(site)
      seen_paths = {}
      top_categories = []

      site.posts.docs.each do |post|
        categories = Array(post.data['categories']).map { |category| category.to_s.strip }.reject(&:empty?)
        next if categories.empty?

        top_category = categories[0]
        top_categories << top_category unless top_categories.include?(top_category)

        next if categories.size < 2

        sub_category = categories[1]
        parent_slug = Jekyll::Utils.slugify(top_category)
        child_slug = Jekyll::Utils.slugify(sub_category)
        permalink = "/categories/#{parent_slug}/#{child_slug}/"

        next if seen_paths[permalink]
        seen_paths[permalink] = true

        page = Jekyll::PageWithoutAFile.new(site, site.source, "categories/#{parent_slug}/#{child_slug}", "index.html")
        page.data['layout'] = 'category'
        page.data['title'] = sub_category
        page.data['parent_category'] = top_category
        page.data['permalink'] = permalink
        site.pages << page
      end

      top_categories.each do |top_category|
        parent_slug = Jekyll::Utils.slugify(top_category)
        permalink = "/categories/#{parent_slug}/"

        next if seen_paths[permalink]
        seen_paths[permalink] = true

        page = Jekyll::PageWithoutAFile.new(site, site.source, "categories/#{parent_slug}", "index.html")
        page.data['layout'] = 'category'
        page.data['title'] = top_category
        page.data['permalink'] = permalink
        site.pages << page
      end
    end
  end
end
