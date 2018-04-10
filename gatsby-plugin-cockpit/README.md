# gatsby-plugin-cockpit

This source plugin pulls [Cockpit Headless CMS](https://getcockpit.com) data to a[GatsbyJS](https://www.gatsbyjs.org), a static site generator for React.

## Resources

+ **[Example project](https://github.com/pierreberchtold/gatsby-cockpit-portfolio)**: a simple portfolio with pages and projects
+ **[Getting started article](https://blog.ginetta.net/getting-started-with-gatsby-and-cockpit-part-1-of-2-d86871932d44)**: an introduction based on the example project.

## Install

`npm install --save gatsby-plugin-cockpit`

##How to use

Add the following to `gatsby-config.js`

```
  plugins: [
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `src`,
        path: `${__dirname}/src/`,
      },
    },
    {
      resolve: 'gatsby-plugin-cockpit',
      options: {
        cockpitConfig: {
          baseURL: 'http://localhost:8888',
          folder: '/cockpit',
          accessToken: '4d659efb084077fd24aeb4871d4386',
          collections: ['posts'],
          regions: ['footer'],
          customComponents: [],
        },
      },
    },
  ],
```

### Options

| Option               |            | Default | Description                                                  |
| -------------------- | ---------- | ------- | ------------------------------------------------------------ |
| **baseURL**          | *required* | *none*  | The url to you Cockpit installation                          |
| **folder**           | *optional* | *''*    | The folder of your Cockpit installation                      |
| **accessToken**      | *required* | *none*  | A valid API access token to you cockpit installation. See the [Cockpit Documentation](https://getcockpit.com/documentation/api/token) |
| **collections**      | *optional* | *[]*    | The specific Cockpit collections you want to fetch. If empty all collections will be fetched. |
| **regions**          | *optional* | *[]*    | The specific Cockpit regions you want to fetch. If empty all regions will be fetched. |
| **customComponents** | *optional* | *[]*    | If you have defined some custom components for you cockpit layout fields and want them to be parsed for image fields. |

## How to Query

You can query *collections*, *regions* and *assets*.

### Query Collections

Collections are converted into nodes. For example a `posts` collections is transformed into `post` nodes. So you can you `allPost` and `post` in your GraphQL queries.

```graphql
allPost {
    edges {
        nodes {
            id
            ...
        }
    }
}
```

### Query Assets

Assets are converted into Gatsby filesystem files and can be fetched with `allFile` or `file`.

```
allFile {
    edges {
        nodes {
            id
            publicURL
            ...
        }
    }
}
```

### Query Regions

Regions are available in GraphQL as region nodes. So if you have a `footer` region in Cockpit with a *col1* and a *col2* field you can use following GraphQL query:

```
footer: region(name: { eq: "footer" }) {
	values {
		col1
		col2
	}
}
```

# Query Child Nodes From Cockpit Fields

The Gatsby **CollectionLink,**  **Asset** and **Image** fields will be parsed and transform into corresponding GraphQL nodes.

### CollectionLink Field

The CollectionLink field links a collection to another collection. Here an example with `players` and `teams` collections.

```
allPlayer {
	edges {
        nodes {
            name
            role
            team {
                name
            }            
        }
	}
}
```

###Asset Field

The asset field gets extended with a `localFile` attribute linking to the corresponding file node. 

For example, if you have a `candidates` collection with a name and a pdf as an asset field. So You can get the PDF URL with following GraphQL query:

```
allCandidate {
	edges {
        nodes {
            name
            pdf {
            	localFile {
	                publicURL                    
            	}
            }            
        }
	}
}
```

### Image Field

Like the asset field, the image field gets extended with a `localFile` attribute linking to the corresponding file node. 

Given a `post` collection with title, content and preview. You can use [`gatsby-image` plugin](https://www.gatsbyjs.org/packages/gatsby-image/) in your GraphQL query and take advantage of Gatsby's image processing features.

```
allPost {
	edges {
        nodes {
            title
            content
            preview {
            	localFile {
                    childImageSharp {
                        sizes(maxWidth: 2000, quality: 90) {
                            ...GatsbyImageSharpSizes_withWebp
                        }
                    }                    
            	}
            }            
        }
	}
}
```
### Layout Field

The layout field enables us to visually arrange components. It is even possible to define custom components corresponding to React Components we will us in Gatsby. This may be done with the [LayoutComponents addon](https://github.com/agentejo/LayoutComponents).

Given a `page` collection with title and content. You can do the following query:

```
allPage {
	edges {
        nodes {
            title
            content {
            	component
		        settings {
                    # component fields
                    ...
		        }
            }    
            content_parsed
            content_files {
                id
                publicURL
                # normal file node
            }
        }
	}
}
```

- ***fieldname*** gives you the components with their settings
- ***fieldname*_parsed** gives you the the same than field name but in an object. It enables you to ignore the type of components in the query and just getting all the component settings.
- ***fieldname*_files** gives you all the file nodes present in the layout.