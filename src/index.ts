import fastify, {DoneFuncWithErrOrRes, FastifyReply, FastifyRequest} from 'fastify'
import basicAuth from '@fastify/basic-auth'
import {CreateAttachmentMutation, LinearClient, LinearFetch, User} from "@linear/sdk";
import {IssueCreateInput, IssueUpdateInput} from "@linear/sdk/dist/_generated_documents";
import {applauseIssueSchema} from "./schema";
import {TypeBoxTypeProvider} from '@fastify/type-provider-typebox'

const server = fastify().withTypeProvider<TypeBoxTypeProvider>()

const assignedTeamId = !process.env.ASSIGNED_TEAM_ID


function validate(username: string, client_password: string, req: FastifyRequest, reply: FastifyReply, done: DoneFuncWithErrOrRes) {
    const password_missing = !process.env.CLIENT_PASSWORD
    if (password_missing) {
        console.log("Missing configured password, authentication will fail")
        done(new Error("Unable to authenticate"))
    }
    if (username === 'Applause' && client_password === process.env.CLIENT_PASSWORD) {
        done()
    } else {
        console.log("Password was not accepted.")
        done(new Error('Nay'))
    }
}

server.register(basicAuth, {validate, authenticate: {realm: "Applause -> Linear"}})

const schema = {
    body: applauseIssueSchema,
}

function formatOptionValue(option: number, options: { value: number, label: string }[]): string {
    return `${option}: ${options.find(({value, label}) => option === value)?.label || "Unknown"}`
}

function appendDescription(linearInput: IssueCreateInput | IssueUpdateInput, title: string, field: {
    value?: any,
    values?: string[] | undefined,
    options?: { value: number, label: string }[] | undefined,
    name: string
}) {
    linearInput.description = linearInput.description + `
**${title}**
${formatOptionValue(field.value, field.options || [])}

`;
}

function equalEnough(string1: string, string2: string) {
    const s1 = string1.replaceAll(/\s{2,}/g, " ")
    const s2 = string2.replaceAll(/\s{2,}/g, " ")

    return s1 === s2
}

server.after(() => {

    server.get('/ping', async (request, reply) => {
        return {message: 'pong'}
    })

    server.route({
        method: "POST",
        url: "/issue",
        schema,
        onRequest: server.basicAuth,
        handler: async (request, reply) => {
            const linearApiKey = process.env.LINEAR_API_KEY;
            if (!linearApiKey) {
                console.warn("Missing Linear API key")
            }
            const linearClient = new LinearClient({apiKey: linearApiKey, headers: {"my-header": "value"}});

            const {fields, attachments} = request.body
            const incomingTitle = fields.find(({name}) => name === "title")?.value

            let issueSearchPayload = await linearClient.searchIssues(incomingTitle);

            const linearInput: IssueUpdateInput | IssueCreateInput = {
                teamId: assignedTeamId,
            }

            let existingIssueId: string | undefined;
            if (issueSearchPayload.totalCount > 0 ) {
                for (let i = 0; i < issueSearchPayload.nodes.length; i++) {
                    if (equalEnough(incomingTitle, issueSearchPayload.nodes[i].title)
                        //Sanity check: never update something that is not in the destination team
                        && assignedTeamId === (await issueSearchPayload.nodes[i].team)?.id) {
                        existingIssueId = issueSearchPayload.nodes[i].id;
                    }
                }
            }

            let createdAt: string | undefined;
            // handle fields
            fields.forEach(field => {
                switch (field.name) {
                    case "title":
                        linearInput.title = field.value
                        break;
                    case "description":
                        linearInput.description = field.value
                        break;
                    case "createDate":
                        createdAt = field.value
                        break;
                    case "source":
                        appendDescription(linearInput, "Source", field)
                        break;
                    case "status":
                        appendDescription(linearInput, "Status", field)
                        break;
                    case "severity":
                        appendDescription(linearInput, "Severity", field)
                        break;
                    case "type":
                        appendDescription(linearInput, "Type", field)
                        break;
                    case "frequency":
                        appendDescription(linearInput, "Frequency", field)
                        break;
                    case "verification":
                        appendDescription(linearInput, "Verification", field)
                        break;
                    default:
                }
            })

            // TODO handle attachments if needed, they are links to Applause's storage buckets which last for ~1 yr
            attachments.forEach(() => {

            })

            try {
                if (existingIssueId) {
                    const issuePayload = await linearClient.updateIssue(existingIssueId, linearInput as IssueUpdateInput)
                    const bugId = (await issuePayload.issue)?.identifier
                    console.log(`Successfully updated ${bugId} in Linear: ` + issuePayload.success)

                    return JSON.stringify({bugId})
                } else {
                    const input = linearInput as IssueCreateInput;
                    if (createdAt) {
                        input.createdAt = new Date(createdAt)
                    }
                    const issuePayload = await linearClient.createIssue(input);
                    const bugId = (await issuePayload.issue)?.identifier

                    console.log(`Successfully created Linear task: ${bugId}`)

                    return JSON.stringify({bugId})
                }
            } catch {
                reply.statusCode = 500
                console.log("Could not create or update task in Linear")
                return JSON.stringify({"message": "Could not create or update task downstream"})
            }
        }
    })
})

server.listen({port: 8080, host: "0.0.0.0"}, (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})