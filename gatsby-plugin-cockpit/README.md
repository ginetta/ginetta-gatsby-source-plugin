You need to add the following to gatsby-config.js

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
      resolve: 'gatsby-source-cockpit-headless-cms',
      options: {
        cockpitConfig: {
          baseURL: 'http://localhost:8888',
          folder: '/cockpit',
          accessToken: '4d659efb084077fd24aeb4871d4386',
          collections: ['Post'],
          regions: ['footer'],
          customComponents: [],
        },
      },
    },
  ],
```

note: The collections and regions field are optional, if omitted the plugin will fetch all collections and all regions.