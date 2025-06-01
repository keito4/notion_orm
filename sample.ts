import { NotionOrmClient } from "./generated/client";

interface Domain {
  title: string;
  index: string;
  children?: Domain[];
}

interface ParentDomain {
  id: string;
  prefix: string;
}

const domains: Domain[] = [
  {
    index: "001",
    title: "general",
    children: [
      {
        index: "002",
        title: "random",
      },
      {
        index: "003",
        title: "schedule_adjustment",
      },
      {
        index: "030",
        title: "notification",
        children: [
          {
            index: "031",
            title: "x",
          },
          {
            index: "032",
            title: "memo",
          },
          {
            index: "033",
            title: "calendar",
          }
        ]
      },
      {
        index: "040",
        title: "branding",
        children: [
          {
            index: "041",
            title: "company_slides",
          },
          {
            index: "042",
            title: "corporate_page",
          }
        ]
      },
      {
        index: "050",
        title: "equipment",
      },
    ]
  },
  {
    index: "100",
    title: "management_general",
    children: [
      {
        index: "110",
        title: "mbo",
      },
      {
        index: "120",
        title: "meeting",
        children: [
          {
            index: "121",
            title: "quarter",
          },
          {
            index: "122",
            title: "monthly",
          },
          {
            index: "123",
            title: "weekly",
          },
          {
            index: "124",
            title: "1on1",
          }
        ]
      },
      {
        index: "130",
        title: "document",
      },
      {
        index: "140",
        title: "automation",
        children: [
          {
            index: "141",
            title: "workflow",
          }
        ]
      },
      {
        index: "150",
        title: "team",
      }
    ]
  },
  {
    index: "200",
    title: "product_general",
    children: [
      {
        index: "210",
        title: "ai_interview",
      },
      {
        index: "220",
        title: "interview_evaluation",
      }
    ]
  },
  {
    index: "300",
    title: "development_general",
  },
  {
    index: "400",
    title: "business_general",
    children: [
      {
        index: "410",
        title: "client",
        children: [
          {
            index: "411",
            title: "zeals",
          },
          {
            index: "412",
            title: "shift",
          }
        ]
      },
    ]
  },
  {
    index: "500",
    title: "marketing_general",
  },
  {
    index: "600",
    title: "customer_success_general",
  },
  {
    index: "700",
    title: "corporate_general",
    children: [
      {
        index: "710",
        title: "hr"
      },
      {
        index: "720",
        title: "finance",
        children: [
          {
            index: "721",
            title: "subsidies",
          },
          {
            index: "722",
            title: "payment",
          },
          {
            index: "723",
            title: "subscription",
          }
        ]
      },
      {
        index: "730",
        title: "legal_general",
      },
      {
        index: "740",
        title: "labor_general",
      }
    ]
  },
  {
    index: "900",
    title: "others",
  },
  {
    index: "910",
    title: "club",
  },
  {
    index: "920",
    title: "bot_test",
  }
];

const createDomain = async (client: NotionOrmClient, domain: Domain, parentDomain?: ParentDomain) => {
  const { title, index, children } = domain;
  let page, prefix;
  if (parentDomain) {
    page = await client.queryDomain().createPage({
      name: `${index}_${parentDomain.prefix}_${title}`,
      parentItem: parentDomain.id,
    });
    console.log(`created domain: ${title} ${page.id}`);
    prefix = `${parentDomain.prefix}_${title}`;
    prefix = prefix.replace("_general", "");
  } else {
    page = await client.queryDomain().createPage({
      name: `${index}_${title}`,
    });
    console.log(`created domain: ${title} ${page.id}`);
    prefix = title;
    prefix = prefix.replace("_general", "");
  }

  if (children) {
    for (const child of children) {
      await createDomain(client, child, {
        id: page.id,
        prefix,
      });
    }
  }
};

async function main() {
  console.log("start");
  const client = new NotionOrmClient(
    "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"
  );

  for (const domain of domains) {
    await createDomain(client, domain);
  }

  console.log("end");
}

(async () => {
  await main();
})();
