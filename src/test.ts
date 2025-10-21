import { createStore } from "./frosty";

interface Profile {
    name: string;
    email: string;
    pictures: string[];
    posts: string[];
}

interface User {
    id: string;
    profile: Profile;
}

const store = createStore<User>({
    id: "",
    profile: {
        name: "",
        email: "",
        pictures: [],
        posts: []
    }
});

let data = store.data;

console.log(data);

let partial = store.getFromKey("profile");

console.log(partial.profile);

store.update({ profile: {
    pictures: ['pic.png'],
    name: "Ventura Boavista",
    email: "ventura@example.org",
    posts: ['hello world part 1', 'hello world part 2']
}});

store.update({id: 'hrfuwhr878wrhf'});

data = store.data;

console.log(data);
console.log('<<------------------>>');

store.subscribe((user: User) => {
    console.log('UPDATED STATE ...');
    console.log(user);
});

store.subscribe((user: User) => {
    console.log('UPDATED STATE ...');
    console.log(user.profile.email);
})

setTimeout(() => {
    const { profile } = store.data
    store.update({
        profile: {
            ...profile,
            email: 'old@email.org',
        }
    })
}, 2000);


setTimeout(() => {
    const { profile } = store.data
    store.update({
        profile: {
            ...profile,
            email: 'ventura@boavista.org',
            pictures: [...profile.pictures, 'pic2.png', 'pic3.png']
        }
    })
}, 5000);
