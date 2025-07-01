import { NotionOrmClient } from "./generated/client";

interface Category {
  title: string;
  index: string;
  children?: Category[];
}

interface ParentCategory {
  id: string;
  prefix: string;
}

// Example category structure for a generic e-commerce or blog platform
const categories: Category[] = [
  {
    index: "001",
    title: "products",
    children: [
      {
        index: "010",
        title: "electronics",
        children: [
          {
            index: "011",
            title: "computers",
          },
          {
            index: "012",
            title: "smartphones",
          },
          {
            index: "013",
            title: "accessories",
          }
        ]
      },
      {
        index: "020",
        title: "clothing",
        children: [
          {
            index: "021",
            title: "mens",
          },
          {
            index: "022",
            title: "womens",
          },
          {
            index: "023",
            title: "kids",
          }
        ]
      },
      {
        index: "030",
        title: "home_garden",
      },
      {
        index: "040",
        title: "sports_outdoors",
      }
    ]
  },
  {
    index: "100",
    title: "blog",
    children: [
      {
        index: "110",
        title: "technology",
      },
      {
        index: "120",
        title: "lifestyle",
      },
      {
        index: "130",
        title: "tutorials",
        children: [
          {
            index: "131",
            title: "beginner",
          },
          {
            index: "132",
            title: "intermediate",
          },
          {
            index: "133",
            title: "advanced",
          }
        ]
      }
    ]
  },
  {
    index: "200",
    title: "documentation",
    children: [
      {
        index: "210",
        title: "api_reference",
      },
      {
        index: "220",
        title: "guides",
      },
      {
        index: "230",
        title: "examples",
      }
    ]
  },
  {
    index: "300",
    title: "support",
    children: [
      {
        index: "310",
        title: "faq",
      },
      {
        index: "320",
        title: "contact",
      },
      {
        index: "330",
        title: "community",
      }
    ]
  },
  {
    index: "900",
    title: "archive",
  }
];

const createCategory = async (client: NotionOrmClient, category: Category, parentCategory?: ParentCategory) => {
  const { title, index, children } = category;
  let page, prefix;
  if (parentCategory) {
    page = await client.queryCategory().createPage({
      name: `${index}_${parentCategory.prefix}_${title}`,
      parentItem: parentCategory.id,
    });
    console.log(`created category: ${title} ${page.id}`);
    prefix = `${parentCategory.prefix}_${title}`;
  } else {
    page = await client.queryCategory().createPage({
      name: `${index}_${title}`,
    });
    console.log(`created category: ${title} ${page.id}`);
    prefix = title;
  }

  if (children) {
    for (const child of children) {
      await createCategory(client, child, {
        id: page.id,
        prefix,
      });
    }
  }
};

async function main() {
  console.log("Creating sample categories...");
  const client = new NotionOrmClient(
    process.env.NOTION_API_KEY || "your-notion-api-key-here"
  );

  for (const category of categories) {
    await createCategory(client, category);
  }

  console.log("Sample categories created successfully!");
}

(async () => {
  await main();
})();