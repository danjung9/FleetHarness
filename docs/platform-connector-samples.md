# War Data Platform and Maven Smart System samples

These entries use the same Connectors cards, filtering, sample preview, explicit
**Use this** action and saved brief inputs as the existing sources. They appear
first. Live Connect stays disabled because no platform adapter is installed.
No live endpoint, authentication method or platform schema is implied.

## Public research

- **War Data Platform:** the [CDAO program description](https://www.ai.mil/)
  describes a shared data-integration layer and standardized access for applications
  and AI. This supports the card's emphasis on data products.
- **Maven Smart System:** the [U.S. Army's public training overview](https://www.army.mil/article/290958)
  describes analysis of imagery and full-motion video. [Palantir's public MSS announcement](https://investors.palantir.com/news-details/2024/Palantir-Expands-Maven-Smart-System-AIML-Capabilities-to-Military-Services/)
  describes integration of sensor feeds and software platforms. These descriptions
  support the card's imagery and sensor-data wording.

Research was limited to public descriptions. Direct retrieval of the CDAO page
returned HTTP 403; its indexed primary-source text supplied the description.
No private platform content, endpoints or records were read.

## Invented demonstration data

The sample field names and values are authored for this app, not official platform
schemas. Every record contains `synthetic: true`.

- WDP: demonstration pump inventory and fictional classroom capacity. The Data
  product filter accepts `training-assets` or `training-schedules`.
- Maven: fictional classroom-diagram annotations and review notes. No actual imagery,
  locations or operational records are included. The Collection filter accepts
  `training-observations` or `training-reviews`.

Both support Search word. Saved samples keep their platform labels, pass through
the existing sanitizer and snapshot integrity checks, and enter a build only after
the person previews, saves and selects them. Selection and prepared-context limits
support all nine connector cards. No service-specific live backend was added.
